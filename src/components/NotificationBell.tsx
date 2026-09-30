"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./IconSprite";
import { useNotifications } from "./NotificationsProvider";

// Basit Türkçe göreli zaman — harici paket eklemeden "2 dk önce" / "3 saat önce" gibi.
function goreliZaman(iso: string) {
  const farkSn = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (farkSn < 60) return "Az önce";
  const dk = Math.floor(farkSn / 60);
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.floor(saat / 24);
  return `${gun} gün önce`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  // Provider'daki bildirim listesi client'ta localStorage'dan senkron okunuyor,
  // ama sunucu her zaman boş liste ile render eder — kırmızı noktayı hydration
  // tamamlanana kadar gizleyip uyuşmazlık uyarısı/çakışması olmasını önlüyoruz.
  const [mounted, setMounted] = useState(false);
  // Panel, topbar'ın video arka planı için gereken overflow:hidden tarafından
  // kırpılmasın diye document.body'ye portal'lanıyor — konumu zil butonunun
  // gerçek ekran koordinatına göre (position:fixed) hesaplanıyor.
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      const clickedInsideWrap = wrapRef.current?.contains(target);
      const clickedInsidePanel = panelRef.current?.contains(target);
      if (!clickedInsideWrap && !clickedInsidePanel) kapat();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ac() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpen(true);
  }

  function kapat() {
    setOpen((wasOpen) => {
      if (wasOpen) markAllRead();
      return false;
    });
  }

  function toggle() {
    if (open) kapat();
    else ac();
  }

  return (
    <div className="notif-pop" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`bell-btn${mounted && unreadCount > 0 ? " has-unread" : ""}`}
        aria-label="Bildirimler"
        onClick={toggle}
      >
        <Icon name="bell" />
      </button>
      {open &&
        panelPos &&
        mounted &&
        createPortal(
          <div
            className="notif-card"
            ref={panelRef}
            style={{ position: "fixed", top: panelPos.top, right: panelPos.right }}
          >
            <div className="notif-head">Bildirimler</div>
            {notifications.length === 0 ? (
              <p className="notif-empty">Henüz bildirim yok.</p>
            ) : (
              <ul className="notif-list">
                {notifications.map((n) => (
                  <li key={n.id} className={`notif-item${n.okundu ? "" : " notif-item-unread"}`}>
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-time">{goreliZaman(n.tarih)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
