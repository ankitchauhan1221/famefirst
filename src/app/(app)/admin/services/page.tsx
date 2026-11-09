import { ApiForm } from "@/components/ApiForm";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { db } from "@/lib/db";
import { inr, pricePer1000 } from "@/lib/pricing";

const ACTION = "/api/admin/action";

export default async function AdminServices({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  await requireAdmin();
  const { q = "", category = "" } = await searchParams;
  const where = { ...(q && { name: { contains: q } }), ...(category && { category }) };
  const [services, total, categories, settings] = await Promise.all([
    db.service.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }], take: 100 }),
    db.service.count({ where }),
    db.service.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    getSettings(),
  ]);
  return (
    <>
      <h1>Services</h1>
      <section className="card stack">
        <div className="row">
          <ApiForm action={ACTION} submitLabel="Import from provider">
            <input type="hidden" name="action" value="syncCatalog" />
          </ApiForm>
          <ApiForm action={ACTION} submitLabel="Enable all supported" buttonClassName="btn btn-plain" confirmText="Enable every supported service for customers?">
            <input type="hidden" name="action" value="enableAll" />
          </ApiForm>
        </div>
        <form className="toolbar">
          <label className="field"><span>Search</span><input name="q" defaultValue={q} /></label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={category}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.category}>{c.category}</option>)}
            </select>
          </label>
          <button className="btn btn-plain">Filter</button>
        </form>
        {category && (
          <div className="row">
            <ApiForm action={ACTION} submitLabel="Enable this category" buttonClassName="btn btn-small btn-plain">
              <input type="hidden" name="action" value="setCategory" />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="enabled" value="true" data-bool />
            </ApiForm>
            <ApiForm action={ACTION} submitLabel="Disable this category" buttonClassName="btn btn-small btn-plain">
              <input type="hidden" name="action" value="setCategory" />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="enabled" value="false" data-bool />
            </ApiForm>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Showing {services.length} of {total}</h2>
        {services.length === 0 && <p className="muted">Nothing here yet. Press Import from provider.</p>}
        {services.map((service) => (
          <ApiForm key={service.id} action={ACTION} submitLabel="Save" className="service-row" buttonClassName="btn btn-small btn-plain">
            <input type="hidden" name="action" value="updateService" />
            <input type="hidden" name="id" value={service.id} />
            <div className="service-meta">
              <b>{service.name}</b>
              <span className="muted">#{service.providerServiceId} · {service.type} · cost {service.providerRate}/1000 · sells at {inr(pricePer1000(service, settings))}</span>
              {!service.supported && <div className="muted">Not supported by the order form</div>}
              <label className="field" style={{ marginTop: 6 }}><span>Name shown to customers</span><input name="displayName" defaultValue={service.displayName ?? ""} placeholder={service.name} /></label>
            </div>
            <label className="field"><span>Margin %</span><input name="marginPercent" type="number" step="0.1" min="0" defaultValue={service.marginPercent ?? ""} placeholder={String(settings.defaultMargin)} /></label>
            <label className="field"><span>Fixed ₹ / 1000</span><input name="customPriceRupees" type="number" step="0.01" min="0" defaultValue={service.customPrice == null ? "" : service.customPrice / 100} /></label>
            <label className="check"><input type="checkbox" name="enabled" defaultChecked={service.enabled} disabled={!service.supported} /> <span>On</span></label>
          </ApiForm>
        ))}
      </section>
    </>
  );
}
