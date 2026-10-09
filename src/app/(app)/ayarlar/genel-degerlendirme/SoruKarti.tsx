"use client";

import { useState } from "react";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { updateDegerlendirmeSorusuAction, deleteDegerlendirmeSorusuAction } from "@/lib/actions";
import { SORU_TIPLERI, soruTipi } from "@/lib/degerlendirme";
import { SoruFormu, type ParselSecenegi } from "./SoruFormu";
import type { DegerlendirmeSorusu } from "@/types";

export function SoruKarti({ soru, parseller }: { soru: DegerlendirmeSorusu; parseller: ParselSecenegi[] }) {
  const [duzenle, setDuzenle] = useState(false);
  const tip = SORU_TIPLERI.find((t) => t.id === soruTipi(soru))!;
  const atanan = soru.parselIds?.length
    ? parseller.filter((p) => soru.parselIds!.includes(p.id)).map((p) => p.ad)
    : null;

  if (duzenle) {
    return (
      <div className="gdq-kart">
        <SoruFormu
          action={updateDegerlendirmeSorusuAction.bind(null, soru.id)}
          parseller={parseller}
          soru={soru}
          onTamam={() => setDuzenle(false)}
        />
      </div>
    );
  }

  return (
    <div className="gdq-kart">
      <div className="gdq-kart-ust">
        <div>
          <div className="gdq-soru">{soru.soru}</div>
          <div className="gdq-meta">
            <span className="gdq-chip">{tip.ad}</span>
            <span className="gdq-chip gdq-chip-soft">
              {atanan ? `${atanan.length} parsel` : "Tüm parseller"}
            </span>
          </div>
        </div>
        <div className="gdq-kart-aksiyon">
          <button type="button" className="btn" onClick={() => setDuzenle(true)}>
            Düzenle
          </button>
          <ConfirmDeleteButton
            action={deleteDegerlendirmeSorusuAction.bind(null, soru.id)}
            label="Sil"
            basariliMesaj={`"${soru.soru}" sorusu silindi.`}
            message={
              <>
                &quot;<strong>{soru.soru}</strong>&quot; sorusunu silmek istediğinize emin misiniz? Bu soruya verilmiş
                geçmiş cevaplar da görünmez olur.
              </>
            }
          />
        </div>
      </div>
      {soru.secenekler && soru.secenekler.length > 0 && (
        <div className="gdq-secenekler">
          {soru.secenekler.map((s) => (
            <span key={s} className="gdq-secenek">
              {s}
            </span>
          ))}
        </div>
      )}
      {atanan && <div className="gdq-atanan">{atanan.join(" · ") || "Atanan parseller silinmiş"}</div>}
    </div>
  );
}
