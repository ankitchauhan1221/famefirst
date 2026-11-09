import Link from "next/link";
import { ApiForm } from "@/components/ApiForm";
import { Logo } from "@/components/Marketing";

export default function ForgotPassword() {
  return (
    <main className="auth">
      <Logo />
      <div className="auth-card">
        <h1>Reset password</h1>
        <ApiForm action="/api/auth/forgot" submitLabel="Send reset link" className="stack">
          <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
        </ApiForm>
        <p className="muted"><Link href="/login" className="link">Back to login</Link></p>
      </div>
    </main>
  );
}
