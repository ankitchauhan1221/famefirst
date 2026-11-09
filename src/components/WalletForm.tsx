"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CheckoutResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.body.appendChild(script);
  });
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function WalletForm({ min, max }: { min: number; max: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await post("/api/wallet/topup", { amount });
      if (data.test) {
        setMessage(data.message);
        router.refresh();
        setBusy(false);
        return;
      }
      await loadCheckout();
      new window.Razorpay!({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: "INR",
        name: data.name,
        prefill: { email: data.email },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result: CheckoutResponse) => {
          try {
            const verified = await post("/api/wallet/verify", result);
            setMessage(verified.message);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not verify the payment.");
          } finally {
            setBusy(false);
          }
        },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <label className="field">
        <span>Amount in rupees</span>
        <input type="number" inputMode="numeric" min={min} max={max} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <div className="chips">
        {[100, 500, 1000, 2500].map((value) => (
          <button type="button" key={value} className="chip" onClick={() => setAmount(String(value))}>₹{value}</button>
        ))}
      </div>
      <button className="btn" disabled={busy}>{busy ? "Please wait…" : "Add funds"}</button>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {message && <p className="alert alert-ok" role="status">{message}</p>}
    </form>
  );
}
