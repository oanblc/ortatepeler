"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createFertigasyonKaydiAction, deleteFertigasyonKaydiAction } from "@/lib/actions";
import { FERTIGASYON_BIRIM, FERTIGASYON_VARSAYILAN_AMBALAJ, type FertigasyonSonucu } from "@/lib/fertigasyon";
import type { Customer, Parcel, FertigasyonKaydi, FertigasyonUrun } from "@/types";

const URUNLER: FertigasyonUrun[] = ["AS21", "K2SO4", "H3PO4", "Demir"];

function formatSayi(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function formatTarih(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function bugun() {
  return new Date().toISOString().slice(0, 10);
}

type KayitGorunumu = { kayit: FertigasyonKaydi; sonuc: FertigasyonSonucu };

function FertigasyonGrupKarti({
  customer,
  parcel,
  tarih,
  urun,
  satirlar,
}: {
  customer: Customer;
  parcel: Parcel;
  tarih: string;
  urun: FertigasyonUrun;
  satirlar: KayitGorunumu[];
}) {
  const birim = FERTIGASYON_BIRIM[urun];
  const toplamIhtiyac = satirlar.reduce((s, x) => s + x.sonuc.toplamIhtiyac, 0);
  const toplamAmbalaj = satirlar.reduce((s, x) => s + x.sonuc.ambalajSayisi, 0);

  return (
    <div className="card fertigasyon-grup-karti">
      <div className="fertigasyon-grup-head">
        <div className="fertigasyon-grup-baslik">
          {formatTarih(tarih)} · {urun}
        </div>
        <div className="fertigasyon-grup-toplam">
          {formatSayi(toplamIhtiyac)} {birim.ambalaj} toplam · {formatSayi(toplamAmbalaj)} {birim.ambalajAdi}
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table fertigasyon-satir-table">
          <thead>
            <tr>
              <th>Vana</th>
              <th>Su Tonajı</th>
              <th>Ağaç Sayısı</th>
              <th>Doz ({birim.doz})</th>
              <th>Toplam</th>
              <th>{birim.ambalajAdi === "çuval" ? "Çuval" : "Bidon"}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {satirlar.map(({ kayit, sonuc }) => (
              <tr key={kayit.id}>
                <td>{kayit.vanaAdi || "—"}</td>
                <td className="num">{kayit.suTonaji != null ? formatSayi(kayit.suTonaji) : "—"}</td>
                <td className="num">{formatSayi(kayit.agacSayisi)}</td>
                <td className="num">{formatSayi(kayit.dozAgac)}</td>
                <td className="num">
                  {formatSayi(sonuc.toplamIhtiyac)} {birim.ambalaj}
                </td>
                <td className="num">{formatSayi(sonuc.ambalajSayisi)}</td>
                <td className="num">
                  <ConfirmDeleteButton
                    action={deleteFertigasyonKaydiAction.bind(null, customer.id, parcel.id, kayit.id)}
                    basariliMesaj="Fertigasyon kaydı silindi."
                    message={<>Bu fertigasyon kaydı silinsin mi?</>}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {satirlar[0]?.kayit.not && <div className="fertigasyon-grup-not">{satirlar[0].kayit.not}</div>}
    </div>
  );
}

export function FertigasyonView({
  customer,
  parcel,
  kayitGorunumleri,
}: {
  customer: Customer;
  parcel: Parcel;
  kayitGorunumleri: KayitGorunumu[];
}) {
  const [yeniUrun, setYeniUrun] = useState<FertigasyonUrun>("AS21");
  const [ambalajBoyutu, setAmbalajBoyutu] = useState(FERTIGASYON_VARSAYILAN_AMBALAJ.AS21);
  const birim = FERTIGASYON_BIRIM[yeniUrun];
  const yeniKayitAction = createFertigasyonKaydiAction.bind(null, customer.id, parcel.id);

  const urunDegistir = (urun: FertigasyonUrun) => {
    setYeniUrun(urun);
    setAmbalajBoyutu(FERTIGASYON_VARSAYILAN_AMBALAJ[urun]);
  };

  // Aynı tarih + ürün kombinasyonundaki vana satırlarını Excel'deki gibi tek
  // bir blokta toplayıp altına toplam satırı ekleyebilmek için gruplanır.
  const gruplar = new Map<string, { tarih: string; urun: FertigasyonUrun; satirlar: KayitGorunumu[] }>();
  for (const satir of kayitGorunumleri) {
    const anahtar = `${satir.kayit.tarih}|${satir.kayit.urun}`;
    if (!gruplar.has(anahtar)) {
      gruplar.set(anahtar, { tarih: satir.kayit.tarih, urun: satir.kayit.urun, satirlar: [] });
    }
    gruplar.get(anahtar)!.satirlar.push(satir);
  }

  return (
    <div className="beslenme-layout">
      <div className="beslenme-plan-sutunu">
        {gruplar.size === 0 ? (
          <div className="card empty-state">
            <Icon name="flask" className="icon" />
            <p>Henüz fertigasyon kaydı yok.</p>
            <p>Sağdaki formdan bir uygulama girerek başlayabilirsin.</p>
          </div>
        ) : (
          Array.from(gruplar.values()).map((grup) => (
            <FertigasyonGrupKarti
              key={`${grup.tarih}|${grup.urun}`}
              customer={customer}
              parcel={parcel}
              tarih={grup.tarih}
              urun={grup.urun}
              satirlar={grup.satirlar}
            />
          ))
        )}
      </div>

      <div className="beslenme-yeni-plan card">
        <h3 className="beslenme-yeni-plan-baslik">Yeni Fertigasyon Kaydı</h3>
        <p className="beslenme-yeni-plan-aciklama">
          Ürünü seçip vana bazında ağaç sayısı ve ağaç başına dozu gir; çuval/bidon boyutu otomatik önerilir,
          istersen değiştirebilirsin.
        </p>
        <form action={yeniKayitAction} className="beslenme-plan-form">
          <div className="field">
            <label>
              Tarih <span className="req">*</span>
            </label>
            <input name="tarih" type="date" defaultValue={bugun()} required />
          </div>
          <div className="field">
            <label>
              Ürün <span className="req">*</span>
            </label>
            <select
              name="urun"
              required
              value={yeniUrun}
              onChange={(e) => urunDegistir(e.target.value as FertigasyonUrun)}
            >
              {URUNLER.map((urun) => (
                <option key={urun} value={urun}>
                  {urun}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Vana Adı (opsiyonel)</label>
            <input name="vanaAdi" type="text" placeholder="Örn. nar yeri" />
          </div>
          <div className="field">
            <label>Su Tonajı (opsiyonel)</label>
            <input name="suTonaji" type="number" step="0.01" min={0} />
          </div>
          <div className="field">
            <label>
              Ağaç Sayısı <span className="req">*</span>
            </label>
            <input name="agacSayisi" type="number" step="1" min={0} required />
          </div>
          <div className="field">
            <label>
              Doz ({birim.doz}) <span className="req">*</span>
            </label>
            <input name="dozAgac" type="number" step="0.01" min={0} required />
          </div>
          <div className="field">
            <label>
              {birim.ambalajAdi === "çuval" ? "Çuval Boyutu (kg)" : "Bidon Boyutu (litre)"} <span className="req">*</span>
            </label>
            <input
              name="ambalajBoyutu"
              type="number"
              step="0.1"
              min={0.1}
              required
              value={ambalajBoyutu}
              onChange={(e) => setAmbalajBoyutu(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Not (opsiyonel)</label>
            <textarea name="not" rows={2} />
          </div>
          <div className="form-actions">
            <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}`} className="btn">
              Vazgeç
            </Link>
            <button type="submit" className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
