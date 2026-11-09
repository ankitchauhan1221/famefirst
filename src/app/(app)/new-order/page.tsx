import { NewOrderForm } from "@/components/NewOrderForm";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { db } from "@/lib/db";
import { pricePer1000 } from "@/lib/pricing";

export default async function NewOrder() {
  const user = await requireUser();
  const [services, settings] = await Promise.all([
    db.service.findMany({ where: { enabled: true, supported: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  const options = services.map((service) => ({
    id: service.id,
    name: service.displayName || service.name,
    category: service.category,
    min: service.min,
    max: service.max,
    refill: service.refill,
    price: pricePer1000(service, settings),
  }));
  return (
    <>
      <h1>New order</h1>
      <section className="card narrow">
        <NewOrderForm services={options} balance={user.balance} />
      </section>
    </>
  );
}
