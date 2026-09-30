"use client";

import { Icon } from "./IconSprite";
import { formatTelefon } from "@/lib/format";
import type { IlgiliKisi } from "@/types";

// Müşteri formundaki tekrarlanabilir "İlgili Kişi" satır editörü — UrunRows
// ile aynı UX deseni (satır ekle/sil, en az 1 satır kalsın, sil butonu tek
// satırdayken gizli/pasif).
export function IlgiliKisiRows({
  ilgiliKisiler,
  onChange,
}: {
  ilgiliKisiler: IlgiliKisi[];
  onChange: (next: IlgiliKisi[]) => void;
}) {
  function kisiGuncelle(i: number, patch: Partial<IlgiliKisi>) {
    onChange(ilgiliKisiler.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  }
  function kisiEkle() {
    onChange([...ilgiliKisiler, { ad: "", telefon: "", email: "" }]);
  }
  function kisiSil(i: number) {
    if (ilgiliKisiler.length > 1) onChange(ilgiliKisiler.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <div className="urun-rows">
        {ilgiliKisiler.map((k, i) => (
          <div className="urun-row" key={i}>
            <div className="field">
              <label htmlFor={`ilgili-kisi-ad-${i}`}>İlgili Kişi</label>
              <input
                id={`ilgili-kisi-ad-${i}`}
                value={k.ad ?? ""}
                onChange={(e) => kisiGuncelle(i, { ad: e.target.value })}
                placeholder="Çiftlikte iletişimde olduğunuz kişi"
              />
            </div>
            <div className="field">
              <label htmlFor={`ilgili-kisi-telefon-${i}`}>Telefon</label>
              <input
                id={`ilgili-kisi-telefon-${i}`}
                inputMode="numeric"
                value={k.telefon ?? ""}
                onChange={(e) => kisiGuncelle(i, { telefon: formatTelefon(e.target.value) })}
                placeholder="0532 000 00 00"
              />
            </div>
            <div className="field">
              <label htmlFor={`ilgili-kisi-email-${i}`}>E-posta</label>
              <input
                id={`ilgili-kisi-email-${i}`}
                type="email"
                value={k.email ?? ""}
                onChange={(e) => kisiGuncelle(i, { email: e.target.value })}
                placeholder="ornek@ortatepeler.com"
              />
            </div>
            <button
              type="button"
              className="icon-btn danger urun-sil"
              onClick={() => kisiSil(i)}
              disabled={ilgiliKisiler.length === 1}
              title="Satırı sil"
            >
              <Icon name="trash" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={kisiEkle}>
        <Icon name="plus" />
        İlgili Kişi Ekle
      </button>
    </>
  );
}
