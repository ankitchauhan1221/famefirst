import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { razorpayEnabled } from "@/lib/config";
import { db } from "@/lib/db";
import { api, ApiError } from "@/lib/http";
import { captureRazorpayPayment, fetchRazorpayPayment, verifyCheckoutSignature } from "@/lib/razorpay";
import { creditPayment } from "@/lib/wallet";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const POST = api(async (req) => {
  const user = await apiUser();
  if (!razorpayEnabled()) throw new ApiError(503, "Payments are not available yet.");
  const input = schema.parse(await req.json());
  if (!verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
    throw new ApiError(400, "Payment could not be verified.");
  }

  const payment = await db.payment.findFirst({ where: { razorpayOrderId: input.razorpay_order_id, userId: user.id } });
  if (!payment) throw new ApiError(404, "Payment not found.");

  let remote = await fetchRazorpayPayment(input.razorpay_payment_id);
  if (remote.order_id !== input.razorpay_order_id || remote.amount !== payment.amount || remote.currency !== "INR") {
    throw new ApiError(400, "Payment details do not match.");
  }
  if (remote.status === "authorized") remote = await captureRazorpayPayment(remote.id, payment.amount);
  if (remote.status !== "captured") throw new ApiError(409, "Payment is still processing. Your wallet updates once it completes.");

  await creditPayment(input.razorpay_order_id, input.razorpay_payment_id);
  return { message: "Funds added to your wallet." };
});
