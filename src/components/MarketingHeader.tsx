"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/hizmetler", label: "Hizmetlerimiz" },
  { href: "/surec", label: "Nasıl Çalışırız" },
  { href: "/dijital-takip", label: "Dijital Takip" },
  { href: "/sss", label: "SSS" },
  { href: "/iletisim", label: "İletişim" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="ot-header">
      <div className="ot-header-row">
        <Link className="ot-header-brand" href="/">
          <img src="/ortatepeler-logo.png" alt="Ortatepeler Zirai Danışmanlık" />
        </Link>
        <nav className="ot-header-links">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ot-header-actions">
          <Link href="/giris" className="ot-header-panel-link ot-header-panel-link-desktop">
            <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 1 1 8 0v3" />
            </svg>
            Panel Girişi
          </Link>
          <Link className="ot-btn ot-btn-brand" href="/iletisim">
            <span>İletişime Geçin</span>
          </Link>
          <button
            type="button"
            className="ot-header-burger"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            aria-controls="ot-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      <nav id="ot-mobile-nav" className={`ot-mobile-nav${open ? " is-open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link href="/giris" className="ot-mobile-nav-panel">
          <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" />
          </svg>
          Panel Girişi
        </Link>
      </nav>
    </header>
  );
}
