import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { isProd, razorpayEnabled, site, TOPUP_MAX_RUPEES, TOPUP_MIN_RUPEES } from "@/lib/config";
import { db } from "@/lib/db";
import { api, ApiError } from "@/lib/http";
import { inr } from "@/lib/pricing";
import { allow } from "@/lib/rate-limit";
import { createRazorpayOrder } from "@/lib/razorpay";
import { credit } from "@/lib/wallet";

const schema = z.object({
  amount: z.coerce
    .number()
    .int("Enter a whole rupee amount.")
    .min(TOPUP_MIN_RUPEES, `Minimum top-up is ₹${TOPUP_MIN_RUPEES}.`)
    .max(TOPUP_MAX_RUPEES, `Maximum top-up is ₹${TOPUP_MAX_RUPEES}.`),
});

export const POST = api(async (req) => {
  const user = await apiUser();
  if (!allow(`topup:${user.id}`, 20, 3_600_000)) throw new ApiError(429, "Too many attempts. Try again later.");
  const amount = schema.parse(await req.json()).amount * 100;

  if (!razorpayEnabled()) {
    if (isProd) throw new ApiError(503, "Payments are not available yet.");
    await db.$transaction((tx) => credit(tx, user.id, amount, "TOPUP", "Test top-up (no gateway configured)"));
    return { test: true, message: `Test mode: ${inr(amount)} added.` };
  }

  const payment = await db.payment.create({ data: { userId: user.id, amount } });
  const order = await createRazorpayOrder(amount, payment.id);
  await db.payment.update({ where: { id: payment.id }, data: { razorpayOrderId: order.id } });
  return { keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount, name: site.name, email: user.email };
});
