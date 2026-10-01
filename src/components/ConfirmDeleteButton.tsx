"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./IconSprite";
import { useNotifications } from "./NotificationsProvider";

const KART_YUKSEKLIK_TAHMINI = 160;

export function ConfirmDeleteButton({
  action,
  message,
  label,
  basariliMesaj,
}: {
  action: (formData: FormData) => void;
  message: React.ReactNode;
  /** Verilirse tetikleyici buton ikon-only yerine metinli (örn. sayfa başlığındaki "Sil" butonu) render edilir. */
  label?: string;
  /**
   * Verilirse "Sil" gönderildiğinde bildirim merkezine optimistic olarak eklenir.
   * redirect YAPMAYAN silme action'ları (örn. deleteParcelAction) için gerekli —
   * onlarda sunucudan dönen bir banner/searchParam olmadığı için bildirim başka
   * yerden üretilemez. redirect YAPAN action'lar (örn. removeCustomerAction) için
   * de geçilebilir; o durumda hedef sayfadaki banner kendi bildirimini ÜRETMEMELİ
   * (çift kayıt olmasın diye) — bkz. musteriler/page.tsx'teki MusterilerBanner "bildir" kullanımı.
   */
  basariliMesaj?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Kart, tablo gibi overflow-x:auto (dolayısıyla spec gereği örtük overflow-y:auto)
  // taşıyan kapsayıcıların içinde kırpılmasın diye document.body'ye portal'lanıyor —
  // konumu tetikleyici butonun gerçek ekran koordinatına göre (position:fixed)
  // hesaplanıyor; altta yeterli yer yoksa yukarı açılıyor (bkz. NotificationBell).
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || cardRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function ac() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const altBosluk = window.innerHeight - rect.bottom;
      const right = window.innerWidth - rect.right;
      if (altBosluk < KART_YUKSEKLIK_TAHMINI && rect.top > altBosluk) {
        setPos({ right, bottom: window.innerHeight - rect.top + 6 });
      } else {
        setPos({ right, top: rect.bottom + 6 });
      }
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={label ? "btn btn-danger" : "icon-btn danger"}
        title="Sil"
        onClick={ac}
      >
        <Icon name="trash" />
        {label}
      </button>
      {open &&
        pos &&
        mounted &&
        createPortal(
          <div
            className="confirm-card"
            ref={cardRef}
            style={{ position: "fixed", right: pos.right, top: pos.top, bottom: pos.bottom }}
          >
            <div className="msg">{message}</div>
            <form
              action={action}
              className="row"
              onSubmit={() => {
                setOpen(false);
                if (basariliMesaj) addNotification(basariliMesaj);
              }}
            >
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Vazgeç
              </button>
              <button type="submit" className="btn btn-danger">
                Sil
              </button>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
