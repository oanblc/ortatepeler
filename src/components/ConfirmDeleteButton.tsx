"use client";

import { useRef, useState, useEffect } from "react";
import { Icon } from "./IconSprite";
import { useNotifications } from "./NotificationsProvider";

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
  const ref = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="confirm-pop" ref={ref}>
      <button
        type="button"
        className={label ? "btn btn-danger" : "icon-btn danger"}
        title="Sil"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="trash" />
        {label}
      </button>
      {open && (
        <div className="confirm-card">
          <div className="msg">{message}</div>
          <form
            action={action}
            className="row"
            onSubmit={() => {
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
        </div>
      )}
    </div>
  );
}
