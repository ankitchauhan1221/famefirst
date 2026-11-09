import Link from "next/link";
import { LiveOrders } from "@/components/LiveOrders";
import { OrderTable } from "@/components/OrderTable";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE, orderSignature } from "@/lib/orders";
import { inr } from "@/lib/pricing";

export default async function Dashboard() {
  const user = await requireUser();
  const [orders, total, active, signature] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.order.count({ where: { userId: user.id } }),
    db.order.count({ where: { userId: user.id, status: { in: ACTIVE } } }),
    orderSignature(user.id),
  ]);
  return (
    <>
      <h1>Hi, {user.username}</h1>
      <LiveOrders active={active} signature={signature} />
      <div className="stats">
        <div className="stat"><small>Balance</small><strong>{inr(user.balance)}</strong></div>
        <div className="stat"><small>Total orders</small><strong>{total}</strong></div>
        <div className="stat"><small>Running now</small><strong>{active}</strong></div>
      </div>
      <div className="row">
        <Link href="/new-order" className="btn">Place an order</Link>
        <Link href="/wallet" className="btn btn-plain">Add funds</Link>
      </div>
      <section className="card">
        <h2>Recent orders</h2>
        <OrderTable orders={orders} />
      </section>
    </>
  );
}
