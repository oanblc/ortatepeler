"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./IconSprite";
import { tablolariExceleAktar, tablolariPdfeAktar, raporlariAntetliPdfeAktar } from "@/lib/disaAktar";
import type { RaporSayfaGirdisi, RaporHazirlayanBilgisi } from "@/lib/disaAktar";

export interface DisaAktarTablo {
  baslik: string;
  eleman: HTMLTableElement | null;
  /** PDF'te yatay sayfa bölünmesinde her şeritte tekrar edilecek ilk N sütun (dondurulmuş sütunlar). */
  sabitSutunSayisi?: number;
}

// Raporlar (Özet/Haftalık Rapor/Günlük Saha Kaydı), Yaprak Gübreleme Planı ve
// Rapor Oluştur tarafından paylaşılan "İndir" düğmesi — DOM'da zaten render
// edilmiş <table> eleman(lar)ını okuyup Excel/PDF üretir (bkz.
// src/lib/disaAktar.ts), böylece indirilen dosya ekranda görünenle (aktif
// filtreler dahil) birebir aynı olur. `antetliPdfGetir` verilmişse (sadece
// Rapor Oluştur) PDF butonu kurumsal antetli çıktı üretir, yoksa düz tablo PDF'i.
export function DisaAktarButton({
  dosyaAdi,
  belgeBasligi,
  tablolariGetir,
  antetliPdfGetir,
}: {
  dosyaAdi: string;
  belgeBasligi: string;
  tablolariGetir: () => DisaAktarTablo[];
  antetliPdfGetir?: () => { sayfalar: RaporSayfaGirdisi[]; hazirlayan: RaporHazirlayanBilgisi; olusturulmaZamani: string } | null;
}) {
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState<"excel" | "pdf" | null>(null);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    function disariTiklandi(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disariTiklandi);
    return () => document.removeEventListener("mousedown", disariTiklandi);
  }, [acik]);

  function gecerliTablolar() {
    return tablolariGetir().filter((t): t is DisaAktarTablo & { eleman: HTMLTableElement } => t.eleman !== null);
  }

  async function exceleAktar() {
    setYukleniyor("excel");
    try {
      await tablolariExceleAktar(gecerliTablolar(), dosyaAdi);
    } finally {
      setYukleniyor(null);
      setAcik(false);
    }
  }

  async function pdfeAktar() {
    setYukleniyor("pdf");
    try {
      const antetliGirdi = antetliPdfGetir?.();
      if (antetliGirdi) {
        await raporlariAntetliPdfeAktar(
          antetliGirdi.sayfalar,
          dosyaAdi,
          antetliGirdi.hazirlayan,
          antetliGirdi.olusturulmaZamani,
        );
      } else {
        await tablolariPdfeAktar(gecerliTablolar(), dosyaAdi, belgeBasligi);
      }
    } finally {
      setYukleniyor(null);
      setAcik(false);
    }
  }

  return (
    <div className="dropdown" ref={kutuRef}>
      <button type="button" className="dropdown-btn" onClick={() => setAcik((a) => !a)}>
        <Icon name="download" className="icon" />
        İndir
      </button>
      {acik && (
        <div className="dropdown-panel dropdown-panel-dar">
          <button type="button" className="dropdown-secenek" onClick={exceleAktar} disabled={yukleniyor !== null}>
            {yukleniyor === "excel" ? "Hazırlanıyor…" : "Excel (.xlsx)"}
          </button>
          <button type="button" className="dropdown-secenek" onClick={pdfeAktar} disabled={yukleniyor !== null}>
            {yukleniyor === "pdf" ? "Hazırlanıyor…" : "PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
