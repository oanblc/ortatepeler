"use client";

import { useEffect } from "react";

// Fotoğraf büyütme penceresi (popup) — Kayıtlar sayfası ve müşterideki Ziyaret Kaydı listesi ortak kullanır.
// Esc kapatır, ← → ile gezilir, dışarı tıklayınca kapanır.
export function FotoGoruntuleyici({
  liste,
  indeks,
  onIndeks,
  onKapat,
}: {
  liste: string[];
  indeks: number;
  onIndeks: (i: number) => void;
  onKapat: () => void;
}) {
  const sayi = liste.length;

  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
      else if (e.key === "ArrowRight" && sayi > 1) onIndeks((indeks + 1) % sayi);
      else if (e.key === "ArrowLeft" && sayi > 1) onIndeks((indeks - 1 + sayi) % sayi);
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [indeks, sayi, onIndeks, onKapat]);

  return (
    <div className="kl-lightbox" role="dialog" aria-modal="true" aria-label="Fotoğraf" onClick={onKapat}>
      <button type="button" className="kl-lb-kapat" aria-label="Kapat" onClick={onKapat}>
        ✕
      </button>
      {sayi > 1 && (
        <button
          type="button"
          className="kl-lb-ok kl-lb-sol"
          aria-label="Önceki fotoğraf"
          onClick={(e) => {
            e.stopPropagation();
            onIndeks((indeks - 1 + sayi) % sayi);
          }}
        >
          ‹
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcının yüklediği serbest boyutlu fotoğraf */}
      <img src={liste[indeks]} alt="Büyütülmüş saha fotoğrafı" onClick={(e) => e.stopPropagation()} />
      {sayi > 1 && (
        <button
          type="button"
          className="kl-lb-ok kl-lb-sag"
          aria-label="Sonraki fotoğraf"
          onClick={(e) => {
            e.stopPropagation();
            onIndeks((indeks + 1) % sayi);
          }}
        >
          ›
        </button>
      )}
      <span className="kl-lb-sayac">
        {indeks + 1} / {sayi}
      </span>
    </div>
  );
}
