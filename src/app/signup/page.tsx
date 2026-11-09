import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiForm } from "@/components/ApiForm";
import { Logo } from "@/components/Marketing";
import { currentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/config";

export default async function Signup() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main className="auth">
      <Logo />
      <div className="auth-card">
        <h1>Create your account</h1>
        <ApiForm action="/api/auth/signup" submitLabel="Sign up" redirectTo="/dashboard" className="stack">
          <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
          <label className="field"><span>Username</span><input name="username" autoComplete="username" required /></label>
          <label className="field"><span>WhatsApp number (optional)</span><input name="whatsapp" type="tel" autoComplete="tel" /></label>
          <label className="field"><span>Password</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label className="field"><span>Confirm password</span><input name="passwordAgain" type="password" autoComplete="new-password" required /></label>
          <label className="check"><input type="checkbox" name="accept" /> <span>I accept the <Link href="/terms" className="link">terms and refund policy</Link>.</span></label>
        </ApiForm>
        {googleEnabled() && (
          <>
            <div className="divider">or</div>
            <a href="/api/auth/google" className="btn btn-google">Continue with Google</a>
          </>
        )}
        <p className="muted">Already registered? <Link href="/login" className="link">Log in</Link></p>
      </div>
    </main>
  );
}
