import Link from "next/link";
import { ApiForm } from "@/components/ApiForm";
import { Logo } from "@/components/Marketing";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="auth">
      <Logo />
      <div className="auth-card">
        <h1>Choose a new password</h1>
        <ApiForm action="/api/auth/reset" submitLabel="Update password" className="stack">
          <input type="hidden" name="token" value={token} />
          <label className="field"><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        </ApiForm>
        <p className="muted"><Link href="/login" className="link">Back to login</Link></p>
      </div>
    </main>
  );
}
