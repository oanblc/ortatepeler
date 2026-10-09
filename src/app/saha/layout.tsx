import type { Metadata, Viewport } from "next";
import { Public_Sans, Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/lib/actions";
import { SwKayit } from "./SwKayit";
import "./saha-theme.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700"] });
const sans = Public_Sans({ variable: "--font-sans-saha", subsets: ["latin"], weight: ["400", "500", "600"] });

// Mobil uygulama (App Store/Play) yayınlanana kadar geçici PWA — /saha altı; bkz. public/saha.webmanifest, public/saha-sw.js.
export const metadata: Metadata = {
  title: "Ortatepeler Saha",
  manifest: "/saha.webmanifest",
  applicationName: "Ortatepeler Saha",
  appleWebApp: { capable: true, title: "Saha", statusBarStyle: "black-translucent" },
  icons: { apple: "/saha-icons/apple-touch-icon.png", icon: "/saha-icons/icon-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#122016",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function SahaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className={`${display.variable} ${sans.variable} sh-app`}>
      <SwKayit />
      <header className="sh-ust">
        <Link href="/saha" className="sh-marka" aria-label="Saha ana sayfa">
          <img src="/saha-icons/icon-192.png" alt="" width={28} height={28} />
          <span>Saha</span>
        </Link>
        <div className="sh-kullanici">
          <span>{user.ad}</span>
          <form action={logoutAction}>
            <button type="submit">Çıkış</button>
          </form>
        </div>
      </header>
      <main className="sh-icerik">{children}</main>
    </div>
  );
}
