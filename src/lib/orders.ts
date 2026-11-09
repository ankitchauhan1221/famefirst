import { Prisma } from "@prisma/client";
import { getSettings } from "./catalog";
import { db } from "./db";
import { ApiError } from "./http";
import { chargeFor, pricePer1000 } from "./pricing";
import { provider, ProviderRejected, type ProviderStatus } from "./provider";
import { credit, debit } from "./wallet";

export const TERMINAL = ["COMPLETED", "PARTIAL", "CANCELED", "FAILED"];
export const ACTIVE = ["PENDING", "PROCESSING", "IN_PROGRESS"];

/** Accepts a full URL, or an Instagram username which becomes a profile URL. */
export function normalizeLink(raw: string) {
  const value = raw.trim();
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(value)) return `https://www.instagram.com/${value.replace(/^@/, "")}/`;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {}
  throw new ApiError(400, "Enter a valid link or Instagram username.");
}

async function refund(tx: Prisma.TransactionClient, orderId: string, userId: string, amount: number, note: string) {
  if (amount <= 0) return;
  const claimed = await tx.order.updateMany({ where: { id: orderId, refundedAmount: 0 }, data: { refundedAmount: amount } });
  if (claimed.count === 1) await credit(tx, userId, amount, "REFUND", note, orderId);
}

export async function placeOrder(
  userId: string,
  input: { serviceId: string; link: string; quantity: number; clientKey: string },
) {
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.enabled || !service.supported) throw new ApiError(400, "This service is not available.");
  if (input.quantity < service.min || input.quantity > service.max) {
    throw new ApiError(400, `Quantity must be between ${service.min} and ${service.max}.`);
  }
  const link = normalizeLink(input.link);
  const charge = chargeFor(pricePer1000(service, await getSettings()), input.quantity);
  if (charge <= 0) throw new ApiError(400, "This service is not priced yet.");

  const serviceName = service.displayName || service.name;
  let order;
  try {
    order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: { userId, serviceId: service.id, serviceName, link, quantity: input.quantity, charge, clientKey: input.clientKey },
      });
      await debit(tx, userId, charge, "ORDER", `${serviceName} x ${input.quantity}`, created.id);
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.order.findUniqueOrThrow({ where: { userId_clientKey: { userId, clientKey: input.clientKey } } });
      return { orderId: existing.id, duplicate: true };
    }
    throw error;
  }

  let providerOrderId: string;
  try {
    providerOrderId = await provider.addOrder({ service: service.providerServiceId, link, quantity: input.quantity });
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    if (error instanceof ProviderRejected) {
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: "FAILED", lastError } });
        await refund(tx, order.id, userId, charge, "Refund: provider rejected the order");
      });
      throw new ApiError(502, "This order could not be placed. Your wallet has been refunded.");
    }
    // A timeout may still have created the order upstream, so a person has to check before any refund.
    await db.order.update({ where: { id: order.id }, data: { status: "NEEDS_REVIEW", lastError } });
    throw new ApiError(502, "We could not confirm this order. Our team will check it and update your order or refund you.");
  }

  await saveProviderOrderId(order.id, providerOrderId);
  return { orderId: order.id };
}

// The provider has already accepted the order here, so losing this id would orphan a paid order.
async function saveProviderOrderId(orderId: string, providerOrderId: string) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await db.order.update({ where: { id: orderId }, data: { status: "PENDING", providerOrderId } });
      return;
    } catch (error) {
      if (attempt === 3) {
        console.error(`Order ${orderId} was accepted as provider order ${providerOrderId} but could not be saved`, error);
        throw new ApiError(502, "We could not confirm this order. Our team will check it and update your order or refund you.");
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

function mapStatus(raw: string | undefined) {
  switch (raw?.trim().toLowerCase()) {
    case "pending":
      return "PENDING";
    case "processing":
      return "PROCESSING";
    case "in progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "partial":
      return "PARTIAL";
    case "canceled":
    case "cancelled":
      return "CANCELED";
    default:
      return null;
  }
}

function toInt(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

async function applyStatus(
  order: { id: string; userId: string; quantity: number; charge: number; serviceName: string },
  result: ProviderStatus,
) {
  const status = mapStatus(result.status);
  const now = new Date();
  if (!status) {
    await db.order.update({
      where: { id: order.id },
      data: { lastSyncedAt: now, lastError: result.error ?? `Unknown provider status: ${result.status}` },
    });
    return;
  }
  const remains = Math.min(Math.max(toInt(result.remains) ?? 0, 0), order.quantity);
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: { notIn: TERMINAL } },
      data: { status, remains, startCount: toInt(result.start_count), lastSyncedAt: now, lastError: null },
    });
    if (updated.count !== 1) return;
    if (status === "CANCELED") await refund(tx, order.id, order.userId, order.charge, `Refund: ${order.serviceName} canceled`);
    if (status === "PARTIAL") {
      const amount = Math.floor((order.charge * remains) / order.quantity);
      await refund(tx, order.id, order.userId, amount, `Partial refund: ${remains} undelivered`);
    }
  });
}

const syncState = globalThis as unknown as { orderSyncRunning?: boolean };

export async function syncOrders() {
  if (syncState.orderSyncRunning) return { checked: 0, skipped: true };
  syncState.orderSyncRunning = true;
  try {
    // Covers a crash between charging the wallet and calling the provider.
    await db.order.updateMany({
      where: { status: "CREATING", createdAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { status: "NEEDS_REVIEW", lastError: "Order was interrupted before reaching the provider." },
    });

    let checked = 0;
    const startedAt = new Date();
    for (let batch = 0; batch < 10; batch += 1) {
      const orders = await db.order.findMany({
        where: {
          status: { in: ACTIVE },
          providerOrderId: { not: null },
          OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: startedAt } }],
        },
        orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
        take: 100,
      });
      if (orders.length === 0) break;
      const results = await provider.statuses(orders.map((order) => order.providerOrderId!));
      for (const order of orders) {
        const result = results[order.providerOrderId!];
        if (result) await applyStatus(order, result);
        else await db.order.update({ where: { id: order.id }, data: { lastSyncedAt: new Date(), lastError: "Missing from provider response." } });
        checked += 1;
      }
    }
    return { checked };
  } finally {
    syncState.orderSyncRunning = false;
  }
}

/** Changes whenever anything a customer sees on their order list changes. */
export async function orderSignature(userId: string) {
  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, status: true, remains: true, refundedAmount: true },
  });
  return orders.map((o) => `${o.id}:${o.status}:${o.remains}:${o.refundedAmount}`).join("|");
}

/** Refreshes one customer's running orders, at most once per order every 8 seconds. */
export async function syncUserOrders(userId: string) {
  const cutoff = new Date(Date.now() - 8_000);
  const orders = await db.order.findMany({
    where: {
      userId,
      status: { in: ACTIVE },
      providerOrderId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
    },
    take: 100,
  });
  if (orders.length === 0) return;
  const results = await provider.statuses(orders.map((order) => order.providerOrderId!));
  for (const order of orders) {
    const result = results[order.providerOrderId!];
    if (result) await applyStatus(order, result);
  }
}

export async function resolveReview(orderId: string, resolution: { refund: true } | { providerOrderId: string }) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "NEEDS_REVIEW") throw new ApiError(400, "This order is not waiting for review.");
    if ("refund" in resolution) {
      await tx.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
      await refund(tx, orderId, order.userId, order.charge, "Refund: order could not be confirmed");
    } else {
      await tx.order.update({ where: { id: orderId }, data: { status: "PENDING", providerOrderId: resolution.providerOrderId, lastError: null } });
    }
  });
}
