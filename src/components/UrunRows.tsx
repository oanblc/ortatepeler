"use client";

import { Icon } from "./IconSprite";
import type { ParcelUrun } from "@/types";

// Parsel ekleme sihirbazı ve parsel düzenleme formu arasında paylaşılan
// tekrarlanabilir "Ürün / Çeşit" satır editörü.
export function UrunRows({
  urunler,
  onChange,
}: {
  urunler: ParcelUrun[];
  onChange: (next: ParcelUrun[]) => void;
}) {
  function urunGuncelle(i: number, patch: Partial<ParcelUrun>) {
    onChange(urunler.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));
  }
  function urunEkle() {
    onChange([...urunler, { urun: "", anac: "" }]);
  }
  function urunSil(i: number) {
    if (urunler.length > 1) onChange(urunler.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <div className="urun-rows">
        {urunler.map((u, i) => (
          <div className="urun-row" key={i}>
            <div className="field">
              <label htmlFor={`urun-${i}`}>
                Dikili Ürün / Çeşit {i === 0 && <span className="req">*</span>}
              </label>
              <input
                id={`urun-${i}`}
                value={u.urun}
                onChange={(e) => urunGuncelle(i, { urun: e.target.value })}
                placeholder="Örn. Valensiya Portakal"
              />
            </div>
            <div className="field">
              <label htmlFor={`anac-${i}`}>Anaç</label>
              <input
                id={`anac-${i}`}
                value={u.anac ?? ""}
                onChange={(e) => urunGuncelle(i, { anac: e.target.value })}
                placeholder="Örn. Troyer"
              />
            </div>
            <button
              type="button"
              className="icon-btn danger urun-sil"
              onClick={() => urunSil(i)}
              disabled={urunler.length === 1}
              title="Satırı sil"
            >
              <Icon name="trash" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn" onClick={urunEkle}>
        <Icon name="plus" />
        Satır Ekle
      </button>
    </>
  );
}
