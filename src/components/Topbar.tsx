import { Breadcrumb } from "./Breadcrumb";
import { TopbarVideo } from "./TopbarVideo";
import { NotificationBell } from "./NotificationBell";
import { Icon } from "./IconSprite";
import { logoutAction } from "@/lib/actions";

function bugununTarihi() {
  return new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
}

export function Topbar({ title, breadcrumb }: { title: string; breadcrumb: { label: string; href?: string }[] }) {
  return (
    <header className="topbar">
      <div className="topbar-media" aria-hidden="true">
        <TopbarVideo />
        <div className="topbar-scrim" />
      </div>
      <div className="topbar-titles">
        <h1>{title}</h1>
        <Breadcrumb items={breadcrumb} />
      </div>
      <div className="topbar-right">
        <span className="date">{bugununTarihi()}</span>
        <NotificationBell />
        {/* Mobilde sol menü (çıkış butonu dahil) gizli olduğu için çıkış burada da var — sadece ≤900px'te görünür. */}
        <form action={logoutAction} className="topbar-cikis">
          <button type="submit" aria-label="Çıkış yap">
            <Icon name="logout" />
            <span>Çıkış</span>
          </button>
        </form>
      </div>
    </header>
  );
}
