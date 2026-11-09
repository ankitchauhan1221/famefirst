import { WalletForm } from "@/components/WalletForm";
import { requireUser } from "@/lib/auth";
import { razorpayEnabled, TOPUP_MAX_RUPEES, TOPUP_MIN_RUPEES } from "@/lib/config";
import { db } from "@/lib/db";
import { inr } from "@/lib/pricing";

export default async function Wallet() {
  const user = await requireUser();
  const entries = await db.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <>
      <h1>Wallet</h1>
      <section className="card narrow">
        <h2>Add funds</h2>
        {!razorpayEnabled() && <p className="alert alert-error" style={{ marginBottom: 14 }}>Razorpay is not connected, so this adds test money only.</p>}
        <WalletForm min={TOPUP_MIN_RUPEES} max={TOPUP_MAX_RUPEES} />
      </section>
      <section className="card">
        <h2>Transactions</h2>
        {entries.length === 0 ? (
          <p className="muted">No transactions yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Details</th><th>Amount</th><th>Balance</th></tr></thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="num">{entry.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</td>
                    <td>{entry.note}</td>
                    <td className={entry.amount > 0 ? "num pos" : "num"}>{entry.amount > 0 ? "+" : ""}{inr(entry.amount)}</td>
                    <td className="num">{inr(entry.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
