"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminShell({ email, children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-page">
      <header className="admin-top">
        <div>
          <p className="admin-kicker">Presets admin</p>
          <strong>{email}</strong>
        </div>
        <button className="admin-text" type="button" onClick={logout}>
          Logout
        </button>
      </header>
      <nav className="admin-nav">
        <Link className={pathname === "/admin" ? "active" : ""} href="/admin">
          Purchases
        </Link>
        <Link className={pathname.startsWith("/admin/settings") ? "active" : ""} href="/admin/settings">
          Payment setup
        </Link>
        <Link href="/">Store</Link>
      </nav>
      {children}
    </div>
  );
}
