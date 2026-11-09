import { Status } from "@/components/Status";
import { inr } from "@/lib/pricing";

type Row = {
  id: string;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  refundedAmount: number;
  status: string;
  remains: number | null;
  createdAt: Date;
};

export function OrderTable({ orders }: { orders: Row[] }) {
  if (orders.length === 0) return <p className="muted">No orders yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Service</th><th>Link</th><th>Qty</th><th>Charge</th><th>Status</th></tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="num">{order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</td>
              <td>{order.serviceName}</td>
              <td className="link-cell">{order.link}</td>
              <td className="num">{order.quantity.toLocaleString("en-IN")}</td>
              <td className="num">
                {inr(order.charge)}
                {order.refundedAmount > 0 && <div className="pos">{inr(order.refundedAmount)} refunded</div>}
              </td>
              <td><Status value={order.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
