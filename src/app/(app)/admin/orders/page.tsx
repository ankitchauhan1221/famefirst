import { ApiForm } from "@/components/ApiForm";
import { OrderTable } from "@/components/OrderTable";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/pricing";

const ACTION = "/api/admin/action";

export default async function AdminOrders() {
  await requireAdmin();
  const [review, orders] = await Promise.all([
    db.order.findMany({ where: { status: "NEEDS_REVIEW" }, orderBy: { createdAt: "asc" }, include: { user: { select: { username: true } } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <>
      <h1>All orders</h1>
      {review.length > 0 && (
        <section className="card stack">
          <h2>Needs review</h2>
          <p className="muted">The provider did not confirm these. Check your provider panel first. Link the order if it exists there, otherwise refund it.</p>
          {review.map((order) => (
            <div key={order.id} className="stack" style={{ borderTop: "1px solid var(--soft-line)", paddingTop: 14 }}>
              <div>
                <b>{order.serviceName}</b> x {order.quantity} for {inr(order.charge)} by @{order.user.username}
                <div className="muted" style={{ overflowWrap: "anywhere" }}>{order.link}</div>
                <div className="muted">{order.lastError}</div>
              </div>
              <div className="row">
                <ApiForm action={ACTION} submitLabel="Link" className="inline" buttonClassName="btn btn-small btn-plain">
                  <input type="hidden" name="action" value="linkReview" />
                  <input type="hidden" name="orderId" value={order.id} />
                  <input name="providerOrderId" placeholder="Provider order id" aria-label="Provider order id" required />
                </ApiForm>
                <ApiForm action={ACTION} submitLabel="Refund" buttonClassName="btn btn-small" confirmText="Refund this order to the customer's wallet?">
                  <input type="hidden" name="action" value="refundReview" />
                  <input type="hidden" name="orderId" value={order.id} />
                </ApiForm>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="card">
        <h2>Latest 100</h2>
        <OrderTable orders={orders} />
      </section>
    </>
  );
}
