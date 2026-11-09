import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";

type Tx = Prisma.TransactionClient;
type Kind = "TOPUP" | "ORDER" | "REFUND" | "ADJUST";

export async function credit(tx: Tx, userId: string, amount: number, kind: Kind, note: string, orderId?: string) {
  const user = await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
  await tx.ledgerEntry.create({ data: { userId, kind, amount, balanceAfter: user.balance, note, orderId } });
}

export async function debit(tx: Tx, userId: string, amount: number, kind: Kind, note: string, orderId?: string) {
  const updated = await tx.user.updateMany({
    where: { id: userId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count !== 1) throw new ApiError(402, "Not enough wallet balance. Add funds and try again.");
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  await tx.ledgerEntry.create({ data: { userId, kind, amount: -amount, balanceAfter: user.balance, note, orderId } });
}

/** Credits a Razorpay payment exactly once, however many callers report it. */
export async function creditPayment(razorpayOrderId: string, razorpayPaymentId: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment) return false;
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "CREATED" },
      data: { status: "PAID", razorpayPaymentId },
    });
    if (claimed.count === 1) await credit(tx, payment.userId, payment.amount, "TOPUP", `Razorpay ${razorpayPaymentId}`);
    return true;
  });
}
