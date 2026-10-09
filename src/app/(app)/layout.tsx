import { Bricolage_Grotesque, Public_Sans, JetBrains_Mono } from "next/font/google";
import { requireUser } from "@/lib/session";
import { IconSprite } from "@/components/IconSprite";
import { Sidebar } from "@/components/Sidebar";
import { RevizePaneli } from "@/components/RevizePaneli";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import "./app-theme.css";
import "./parseller-theme.css";
import "./rapor-antet-theme.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sansApp = Public_Sans({
  variable: "--font-sans-app",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const monoApp = JetBrains_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className={`${display.variable} ${sansApp.variable} ${monoApp.variable} tarla-app`}>
      <IconSprite />
      <NotificationsProvider>
        <div className="app-shell">
          <Sidebar user={{ ad: user.ad, rol: user.rol }} />
          <div className="app-main">{children}</div>
        </div>
        <RevizePaneli />
      </NotificationsProvider>
    </div>
  );
}
