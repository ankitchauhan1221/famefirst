"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const USER_LINKS = [
  ["/dashboard", "Dashboard"],
  ["/new-order", "New order"],
  ["/orders", "My orders"],
  ["/wallet", "Wallet"],
];
const ADMIN_LINKS = [
  ["/admin", "Overview"],
  ["/admin/services", "Services"],
  ["/admin/orders", "All orders"],
  ["/admin/users", "Users"],
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const item = ([href, label]: string[]) => (
    <Link key={href} href={href} className={pathname === href ? "nav-item active" : "nav-item"}>
      {label}
    </Link>
  );
  return (
    <nav className="app-nav" aria-label="Account">
      {USER_LINKS.map(item)}
      {isAdmin && <span className="nav-label">Admin</span>}
      {isAdmin && ADMIN_LINKS.map(item)}
    </nav>
  );
}
