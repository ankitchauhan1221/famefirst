import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, type RazorpayPayment } from "@/lib/razorpay";
import { creditPayment } from "@/lib/wallet";

// Backup for buyers who close the page before /api/wallet/verify runs.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, secret)) return NextResponse.json({ error: "Bad signature." }, { status: 400 });

  const event = JSON.parse(rawBody) as { event: string; payload?: { payment?: { entity?: RazorpayPayment } } };
  const entity = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && entity?.order_id) {
    const payment = await db.payment.findUnique({ where: { razorpayOrderId: entity.order_id } });
    if (payment && payment.amount === entity.amount && entity.currency === "INR") {
      await creditPayment(entity.order_id, entity.id);
    }
  }
  return NextResponse.json({ ok: true });
}
