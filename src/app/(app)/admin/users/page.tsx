import { ApiForm } from "@/components/ApiForm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/pricing";

const ACTION = "/api/admin/action";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q } }, { username: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <h1>Users</h1>
      <form className="toolbar">
        <label className="field"><span>Search email or username</span><input name="q" defaultValue={q} /></label>
        <button className="btn btn-plain">Search</button>
      </form>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>WhatsApp</th><th>Balance</th><th>Adjust balance</th><th>Access</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><b>@{user.username}</b>{user.role === "ADMIN" && " (admin)"}<div className="muted">{user.email}</div></td>
                  <td className="num">{user.whatsapp ?? "-"}</td>
                  <td className="num">{inr(user.balance)}</td>
                  <td>
                    <ApiForm action={ACTION} submitLabel="Apply" className="inline" buttonClassName="btn btn-small btn-plain" resetOnSuccess>
                      <input type="hidden" name="action" value="adjustBalance" />
                      <input type="hidden" name="userId" value={user.id} />
                      <input name="rupees" type="number" step="0.01" placeholder="₹ +/-" aria-label="Amount in rupees" required />
                      <input name="note" placeholder="Reason" aria-label="Reason" required />
                    </ApiForm>
                  </td>
                  <td>
                    <ApiForm action={ACTION} submitLabel={user.blocked ? "Unblock" : "Block"} buttonClassName="btn btn-small btn-plain">
                      <input type="hidden" name="action" value="setBlocked" />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="blocked" value={String(!user.blocked)} data-bool />
                    </ApiForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
