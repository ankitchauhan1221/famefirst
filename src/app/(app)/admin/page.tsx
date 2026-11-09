import { ApiForm } from "@/components/ApiForm";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { db } from "@/lib/db";
import { inr } from "@/lib/pricing";
import { provider } from "@/lib/provider";

const ACTION = "/api/admin/action";

async function providerBalance() {
  try {
    const { balance, currency } = await provider.balance();
    return `${balance} ${currency}`;
  } catch (error) {
    console.error("Provider balance failed", error);
    return "Unavailable";
  }
}

export default async function AdminOverview() {
  await requireAdmin();
  const [users, orders, review, paid, settings, balance] = await Promise.all([
    db.user.count(),
    db.order.count(),
    db.order.count({ where: { status: "NEEDS_REVIEW" } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    getSettings(),
    providerBalance(),
  ]);
  return (
    <>
      <h1>Admin</h1>
      {provider.isTestMode() && <p className="alert alert-error">Test provider is active. Set PROVIDER_API_URL and PROVIDER_API_KEY for real orders.</p>}
      <div className="stats">
        <div className="stat"><small>Users</small><strong>{users}</strong></div>
        <div className="stat"><small>Orders</small><strong>{orders}</strong></div>
        <div className="stat"><small>Need review</small><strong>{review}</strong></div>
        <div className="stat"><small>Razorpay received</small><strong>{inr(paid._sum.amount ?? 0)}</strong></div>
        <div className="stat"><small>Provider balance</small><strong>{balance}</strong></div>
      </div>
      <section className="card narrow">
        <h2>Pricing</h2>
        <ApiForm action={ACTION} submitLabel="Save pricing" className="stack">
          <input type="hidden" name="action" value="updateSettings" />
          <label className="field"><span>Default margin %</span><input name="defaultMargin" type="number" step="0.1" min="0" defaultValue={settings.defaultMargin} required /></label>
          <label className="field">
            <span>Provider currency to INR</span>
            <input name="currencyMultiplier" type="number" step="0.0001" min="0.0001" defaultValue={settings.currencyMultiplier} required />
            <small>Use 1 if your provider charges in INR. Use the current exchange rate if it charges in USD.</small>
          </label>
        </ApiForm>
      </section>
      <section className="card narrow">
        <h2>Order status</h2>
        <p className="muted" style={{ marginBottom: 14 }}>Orders are checked automatically every 2 minutes.</p>
        <ApiForm action={ACTION} submitLabel="Check now" buttonClassName="btn btn-plain">
          <input type="hidden" name="action" value="syncOrders" />
        </ApiForm>
      </section>
    </>
  );
}
