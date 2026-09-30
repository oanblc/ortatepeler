import Link from "next/link";
import { Icon } from "./IconSprite";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  if (items.length === 0) {
    return (
      <div className="breadcrumb">
        <span className="current" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="home" />
          Pano
        </span>
      </div>
    );
  }

  return (
    <div className="breadcrumb">
      <Link href="/panel">
        <Icon name="home" />
        Pano
      </Link>
      {items.map((item, i) => (
        <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="chevron-r" className="sep" />
          {item.href && i < items.length - 1 ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="current">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
