import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiForm } from "@/components/ApiForm";
import { Logo } from "@/components/Marketing";
import { currentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/config";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main className="auth">
      <Logo />
      <div className="auth-card">
        <h1>Welcome back</h1>
        {error === "google" && <p className="alert alert-error">Google sign-in did not work. Please try again.</p>}
        <ApiForm action="/api/auth/login" submitLabel="Log in" redirectTo="/dashboard" className="stack">
          <label className="field"><span>Email or username</span><input name="identifier" autoComplete="username" required /></label>
          <label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
        </ApiForm>
        {googleEnabled() && (
          <>
            <div className="divider">or</div>
            <a href="/api/auth/google" className="btn btn-google">Continue with Google</a>
          </>
        )}
        <p className="muted"><Link href="/forgot-password" className="link">Forgot password?</Link> · New here? <Link href="/signup" className="link">Sign up</Link></p>
      </div>
    </main>
  );
}
