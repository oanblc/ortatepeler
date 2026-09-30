"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { Icon } from "./IconSprite";

const NAV_ITEMS = [
  { href: "/panel", label: "Pano", icon: "home", match: (p: string) => p === "/panel" },
  { href: "/musteriler", label: "Müşteriler", icon: "users", match: (p: string) => p.startsWith("/musteriler") },
  { href: "/gelir-gider", label: "Gelir Gider", icon: "wallet", match: (p: string) => p.startsWith("/gelir-gider") },
  { href: "/rapor-olustur", label: "Rapor Oluştur", icon: "reports", match: (p: string) => p.startsWith("/rapor-olustur") },
];

export function Sidebar({ user }: { user: { ad: string; rol: "admin" | "muhendis" } }) {
  const pathname = usePathname();
  const initials = user.ad
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="sidebar">
      <Link href="/panel" className="brand-mark">
        <img src="/ortatepeler-logo.png" alt="Ortatepeler Zirai Danışmanlık" className="brand-mark-logo" />
      </Link>
      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
        <div className="nav-group-label">Sistem</div>
        {user.rol === "admin" && (
          <Link href="/kullanicilar" aria-current={pathname.startsWith("/kullanicilar") ? "page" : undefined}>
            <Icon name="users" />
            Kullanıcılar
          </Link>
        )}
        <Link href="/ayarlar" aria-current={pathname.startsWith("/ayarlar") ? "page" : undefined}>
          <Icon name="settings" />
          Ayarlar
        </Link>
      </nav>
      <div className="sidebar-foot">
        <div className="avatar">{initials}</div>
        <div className="who">
          <div className="name">{user.ad}</div>
          <div className="role">{user.rol === "admin" ? "Yönetici" : "Ziraat Mühendisi"}</div>
        </div>
        <form action={logoutAction}>
          <button type="submit" title="Çıkış yap">
            <Icon name="logout" />
          </button>
        </form>
      </div>
    </aside>
  );
}
