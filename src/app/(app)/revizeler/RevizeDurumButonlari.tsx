"use client";

import { useTransition } from "react";
import { revizeDurumAction, revizeSilAction } from "@/lib/revizeActions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import type { RevizeDurumu } from "@/types";

export function RevizeDurumButonlari({ id, durum }: { id: string; durum: RevizeDurumu }) {
  const [bekliyor, start] = useTransition();
  const ayarla = (d: RevizeDurumu) => start(() => revizeDurumAction(id, d));
  return (
    <div className="rv-aksiyon">
      {durum !== "yapildi" && (
        <button type="button" className="btn" disabled={bekliyor} onClick={() => ayarla("yapildi")}>
          Yapıldı
        </button>
      )}
      {durum !== "iptal" && (
        <button type="button" className="btn" disabled={bekliyor} onClick={() => ayarla("iptal")}>
          İptal
        </button>
      )}
      {durum !== "acik" && (
        <button type="button" className="btn" disabled={bekliyor} onClick={() => ayarla("acik")}>
          Yeniden aç
        </button>
      )}
      <ConfirmDeleteButton
        action={revizeSilAction.bind(null, id)}
        basariliMesaj="Revize silindi."
        message="Bu revizeyi silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
