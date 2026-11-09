import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { site } from "@/lib/config";

export function Logo() {
  return (
    <Link href="/" className="logo">
      <span className="logo-mark" aria-hidden="true">↗</span>
      {site.name}
    </Link>
  );
}

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="site-header wrap">
      <Logo />
      <nav className="site-nav" aria-label="Main">
        {user ? (
          <Link href="/dashboard" className="btn btn-small">Dashboard</Link>
        ) : (
          <>
            <Link href="/login" className="link">Log in</Link>
            <Link href="/signup" className="btn btn-small">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer wrap">
      <span>© {new Date().getFullYear()} {site.name}. Not affiliated with Instagram or Meta.</span>
      <nav aria-label="Legal">
        <Link href="/terms">Terms, privacy and refunds</Link>
      </nav>
    </footer>
  );
}
