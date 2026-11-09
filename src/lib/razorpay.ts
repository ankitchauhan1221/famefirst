import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://api.razorpay.com/v1";

function headers() {
  const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Razorpay ${path} failed with HTTP ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

function matches(expectedHex: string, actual: string) {
  const a = Buffer.from(expectedHex);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return matches(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  return matches(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string };

export const createRazorpayOrder = (amount: number, receipt: string) =>
  request<{ id: string }>("/orders", { amount, currency: "INR", receipt });

export const fetchRazorpayPayment = (id: string) => request<RazorpayPayment>(`/payments/${encodeURIComponent(id)}`);

export const captureRazorpayPayment = (id: string, amount: number) =>
  request<RazorpayPayment>(`/payments/${encodeURIComponent(id)}/capture`, { amount, currency: "INR" });
