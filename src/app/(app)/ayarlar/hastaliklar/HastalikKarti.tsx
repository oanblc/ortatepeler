"use client";

import { useState } from "react";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { updateHastalikTanimiAction, deleteHastalikTanimiAction } from "@/lib/actions";
import { HastalikFormu } from "./HastalikFormu";
import type { HastalikTanimi } from "@/types";

export function HastalikKarti({ hastalik }: { hastalik: HastalikTanimi }) {
  const [duzenle, setDuzenle] = useState(false);

  if (duzenle) {
    return (
      <div className="gdq-kart">
        <HastalikFormu action={updateHastalikTanimiAction.bind(null, hastalik.id)} varsayilan={hastalik.ad} onTamam={() => setDuzenle(false)} />
      </div>
    );
  }

  return (
    <div className="gdq-kart">
      <div className="gdq-kart-ust">
        <div className="gdq-soru" style={{ margin: 0 }}>
          {hastalik.ad}
        </div>
        <div className="gdq-kart-aksiyon">
          <button type="button" className="btn" onClick={() => setDuzenle(true)}>
            Düzenle
          </button>
          <ConfirmDeleteButton
            action={deleteHastalikTanimiAction.bind(null, hastalik.id)}
            label="Sil"
            basariliMesaj={`"${hastalik.ad}" listeden silindi.`}
            message={
              <>
                &quot;<strong>{hastalik.ad}</strong>&quot; öğesini listeden silmek istediğinize emin misiniz? Geçmiş kayıtlarda adı görünmeye devam eder.
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
