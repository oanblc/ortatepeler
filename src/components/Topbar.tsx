import { Breadcrumb } from "./Breadcrumb";
import { TopbarVideo } from "./TopbarVideo";
import { NotificationBell } from "./NotificationBell";

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
      </div>
    </header>
  );
}
