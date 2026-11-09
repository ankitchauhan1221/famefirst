"use client";

import { FormEvent, useMemo, useState } from "react";

export type OrderService = { id: string; name: string; category: string; min: number; max: number; price: number; refill: boolean };

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function NewOrderForm({ services, balance }: { services: OrderService[]; balance: number }) {
  const categories = useMemo(() => [...new Set(services.map((s) => s.category))], [services]);
  const [category, setCategory] = useState(categories[0] ?? "");
  const inCategory = services.filter((s) => s.category === category);
  const [serviceId, setServiceId] = useState(inCategory[0]?.id ?? "");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [clientKey, setClientKey] = useState(newKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const service = services.find((s) => s.id === serviceId);
  const qty = Number(quantity);
  const total = service && Number.isInteger(qty) && qty > 0 ? Math.ceil((service.price * qty) / 1000) : 0;
  const short = total > balance;

  function chooseCategory(value: string) {
    setCategory(value);
    setServiceId(services.find((s) => s.category === value)?.id ?? "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, link, quantity, clientKey }),
      });
      const data = await response.json();
      if (response.ok) {
        window.location.assign("/orders");
        return;
      }
      // The server answered, so this attempt is finished and a retry must be a new order.
      setClientKey(newKey());
      setError(data.error || "Something went wrong.");
    } catch {
      // Keep the same key: the first attempt may have gone through.
      setError("Network error. Press Place order again; you will not be charged twice.");
    } finally {
      setBusy(false);
    }
  }

  if (services.length === 0) return <p className="muted">No services are available right now. Please check back soon.</p>;

  return (
    <form onSubmit={submit} className="stack">
      <label className="field">
        <span>Category</span>
        <select value={category} onChange={(e) => chooseCategory(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Service</span>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {inCategory.map((s) => <option key={s.id} value={s.id}>{s.name} ({money(s.price)} per 1000)</option>)}
        </select>
      </label>
      <label className="field">
        <span>Instagram username or link</span>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="@yourhandle or a post link" required maxLength={500} />
        <small>Your account must be public. We never ask for your password.</small>
      </label>
      <label className="field">
        <span>Quantity</span>
        <input type="number" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={service?.min} max={service?.max} required />
        {service && <small>Min {service.min.toLocaleString("en-IN")}, max {service.max.toLocaleString("en-IN")}{service.refill ? ". Refill available." : "."}</small>}
      </label>
      <div className="total">
        <span>Total</span>
        <strong>{money(total)}</strong>
      </div>
      {short && <p className="alert alert-error">Your balance is {money(balance)}. <a href="/wallet">Add funds</a> to place this order.</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <button className="btn" disabled={busy || short || !service}>{busy ? "Placing…" : "Place order"}</button>
    </form>
  );
}
