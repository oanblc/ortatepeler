"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./IconSprite";
import { useNotifications } from "./NotificationsProvider";
import { revizeKaydetAction } from "@/lib/revizeActions";
import { sayfaAdiBul } from "@/lib/yardimBilgisi";

// Sağ altta yüzen "Revize" butonu: o an açık olan sayfa için değişiklik talebi yazılır,
// /revizeler sayfasında sayfa bazlı toplanır.
export function RevizePaneli() {
  const pathname = usePathname();
  const { addNotification } = useNotifications();
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState("");
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, start] = useTransition();
  const sayfaAdi = sayfaAdiBul(pathname);

  function gonder() {
    const temiz = metin.trim();
    if (!temiz) return;
    setHata(null);
    start(async () => {
      try {
        await revizeKaydetAction(pathname, temiz);
        setMetin("");
        setKaydedildi(true);
        addNotification(`Revize kaydedildi: ${sayfaAdi}`);
      } catch {
        setHata("Revize kaydedilemedi, lütfen tekrar deneyin. Yazdığınız metin korundu.");
      }
    });
  }

  if (!acik) {
    return (
      <button type="button" className="yb-fab" onClick={() => { setAcik(true); setKaydedildi(false); }} aria-label="Ozana havale et">
        <Icon name="edit" />
        <span>Ozana Havale Et</span>
      </button>
    );
  }

  return (
    <section className="yb-panel" aria-label="Ozana havale et">
      <header className="yb-head">
        <div>
          <div className="yb-title">Ozana havale et</div>
          <div className="yb-sub">Şu an: {sayfaAdi}</div>
        </div>
        <button type="button" className="yb-close" onClick={() => setAcik(false)} aria-label="Kapat">
          <Icon name="x" />
        </button>
      </header>
      <div className="yb-revize">
        <p className="yb-revize-ack">
          Bu sayfada değiştirilmesini istediğiniz bir şey varsa yazın. Revize <strong>{sayfaAdi}</strong> sayfası için kaydedilir.
        </p>
        {kaydedildi ? (
          <div className="yb-basari">
            <strong>Revize kaydedildi.</strong>
            <span>
              <Link href="/revizeler" onClick={() => setAcik(false)}>
                Revizeler sayfasında
              </Link>{" "}
              görebilirsiniz.
            </span>
            <button type="button" className="btn" onClick={() => setKaydedildi(false)}>
              Yeni revize ekle
            </button>
          </div>
        ) : (
          <>
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              rows={7}
              placeholder="Örn. Ziyaret Kaydı sekmesinde fotoğraf ekleme butonu daha büyük olsun; reçete alanı zorunlu olmasın."
            />
            {hata && <p className="yb-hata">{hata}</p>}
            <button type="button" className="btn btn-primary" onClick={gonder} disabled={bekliyor || !metin.trim()}>
              {bekliyor ? "Kaydediliyor…" : "Revizeyi Kaydet"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
