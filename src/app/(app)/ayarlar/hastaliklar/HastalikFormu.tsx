"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/IconSprite";
import { useNotifications } from "@/components/NotificationsProvider";

// Hastalık/zararlı adı formu — hem "yeni ekle" hem "adı düzenle" için.
export function HastalikFormu({
  action,
  varsayilan,
  onTamam,
}: {
  action: (formData: FormData) => Promise<void>;
  varsayilan?: string;
  onTamam?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, start] = useTransition();
  const { addNotification } = useNotifications();

  function gonder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setHata(null);
    start(async () => {
      try {
        await action(fd);
        addNotification(varsayilan ? "Ad güncellendi." : "Hastalık/zararlı eklendi.");
        if (!varsayilan) formRef.current?.reset();
        onTamam?.();
      } catch (err) {
        setHata(err instanceof Error ? err.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={gonder} className="hk-form">
      <div className="hk-form-satir">
        <input name="ad" required maxLength={100} defaultValue={varsayilan} placeholder="Örn. Dal Kanseri, Beyaz Sinek, Kırmızı Örümcek" autoFocus={!!varsayilan} />
        {onTamam && (
          <button type="button" className="btn" onClick={onTamam} disabled={bekliyor}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={bekliyor}>
          {!varsayilan && <Icon name="plus" className="icon" />}
          {bekliyor ? "Kaydediliyor…" : varsayilan ? "Kaydet" : "Ekle"}
        </button>
      </div>
      {hata && <p className="gdq-hata">{hata}</p>}
    </form>
  );
}
