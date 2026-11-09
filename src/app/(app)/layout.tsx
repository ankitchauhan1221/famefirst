import Link from "next/link";
import { ApiForm } from "@/components/ApiForm";
import { AppNav } from "@/components/AppNav";
import { Logo } from "@/components/Marketing";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/pricing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        <Link href="/wallet" className="side-balance">
          <small>Wallet balance</small>
          <strong>{inr(user.balance)}</strong>
        </Link>
        <AppNav isAdmin={user.role === "ADMIN"} />
        <div className="side-foot">
          <span className="muted">@{user.username}</span>
          <ApiForm action="/api/auth/logout" submitLabel="Log out" redirectTo="/" buttonClassName="btn btn-small btn-plain" />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
