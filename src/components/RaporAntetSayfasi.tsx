"use client";

import { forwardRef } from "react";

// Rapor Oluştur ekranının kurumsal antetli sayfa şablonu — onaylanan tasarım
// https://claude.ai/code/artifact/1efba5d4-a84f-4bac-9a5a-0a35b2300147'daki
// .antet/.altin-cizgi/.rapor-baslik-blok/.rapor-govde/.imza-blok/.rapor-altbilgi
// yapısının birebir React karşılığı. Her rapor türü kendi `children`'ını
// (.govde-bolum + table.rapor-tablo) doldurur, antet/altbilgi HER ZAMAN aynı
// kalır. `ref`, disaAktar.ts'in "ekranda görüneni oku" ilkesiyle export
// sırasında bu sayfanın içindeki tabloları toplamak için kullanılır.

export interface RaporAntetMetaSatiri {
  k: string;
  v: string;
}

export interface RaporAntetSayfasiProps {
  eyebrow: string;
  baslik: string;
  altBaslik: string;
  metaSatirlari: RaporAntetMetaSatiri[];
  hazirlayanAd: string;
  hazirlayanUnvan: string;
  hazirlayanIletisim: string;
  olusturulmaZamani: string; // ISO — server'da üretilir, render zamanına göre DEĞİL
  sayfaNo?: { mevcut: number; toplam: number };
  /** Sadece belgenin son mantıksal sayfasında true — imza bloğu her sayfada tekrarlanmaz. */
  imzaGoster?: boolean;
  children: React.ReactNode;
}

function formatOlusturulma(iso: string): string {
  const d = new Date(iso);
  const tarih = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${tarih} ${saat}`;
}

export const RaporAntetSayfasi = forwardRef<HTMLDivElement, RaporAntetSayfasiProps>(function RaporAntetSayfasi(
  {
    eyebrow,
    baslik,
    altBaslik,
    metaSatirlari,
    hazirlayanAd,
    hazirlayanUnvan,
    hazirlayanIletisim,
    olusturulmaZamani,
    sayfaNo,
    imzaGoster = false,
    children,
  },
  ref,
) {
  return (
    <div className="rapor-sayfa" ref={ref}>
      <div className="antet">
        <div className="antet-marka">
          {/* eslint-disable-next-line @next/next/no-img-element -- ekran içi önizleme; PDF çıktısı aynı dosyayı base64 gömerek kullanır (bkz. disaAktar.ts logoYukle) */}
          <img src="/ortatepeler-logo.png" alt="Ortatepeler Zirai Danışmanlık Ltd. Şti." />
        </div>
        <div className="antet-iletisim">
          <div>
            <strong>Efe Ortatepe</strong>
          </div>
          <div>0506 530 30 96</div>
        </div>
      </div>
      <div className="altin-cizgi" />

      <div className="rapor-baslik-blok">
        <div className="rapor-eyebrow">{eyebrow}</div>
        <h2>{baslik}</h2>
        <div className="rapor-alt-baslik">{altBaslik}</div>
        {metaSatirlari.length > 0 && (
          <div className="meta-satir">
            {metaSatirlari.map((m) => (
              <div className="meta-item" key={m.k}>
                <div className="k">{m.k}</div>
                <div className="v">{m.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rapor-govde">{children}</div>

      {imzaGoster && (
        <div className="imza-blok">
          <div className="imza-item">
            <div className="imza-cizgi" />
            <div className="imza-ad">{hazirlayanAd}</div>
            <div className="imza-unvan">{hazirlayanUnvan}</div>
          </div>
        </div>
      )}

      <div className="rapor-altbilgi">
        <div className="sol">
          <span>Ortatepeler Zirai Danışmanlık Ltd. Şti.</span>
          <span>·</span>
          <span className="gizlilik">Bu rapor yalnızca ilgili müşteri içindir.</span>
        </div>
        <span>
          {sayfaNo ? `Sayfa ${sayfaNo.mevcut} / ${sayfaNo.toplam} — ` : ""}
          {formatOlusturulma(olusturulmaZamani)}&apos;de oluşturuldu
        </span>
      </div>
    </div>
  );
});
