import { LiveOrders } from "@/components/LiveOrders";
import { OrderTable } from "@/components/OrderTable";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE, orderSignature } from "@/lib/orders";

export default async function Orders() {
  const user = await requireUser();
  const [orders, active, signature] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.order.count({ where: { userId: user.id, status: { in: ACTIVE } } }),
    orderSignature(user.id),
  ]);
  return (
    <>
      <h1>My orders</h1>
      <LiveOrders active={active} signature={signature} />
      <section className="card">
        <OrderTable orders={orders} />
      </section>
    </>
  );
}
