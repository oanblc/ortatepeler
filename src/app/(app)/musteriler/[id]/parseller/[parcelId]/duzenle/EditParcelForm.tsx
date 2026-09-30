"use client";

import { useState } from "react";
import Link from "next/link";
import { updateParcelAction, createWellAction } from "@/lib/actions";
import { UrunRows } from "@/components/UrunRows";
import { Icon } from "@/components/IconSprite";
import { SULAMA_SEKILLERI, hesaplaAgacSayisi } from "@/lib/parcelForm";
import type { Customer, Parcel, Well, ParcelUrun } from "@/types";

// Parsel Ekle sihirbazının 2-5. adımlarındaki alanları tek sayfada, mevcut
// değerlerle önceden doldurulmuş halde gösteren düzenleme formu. Sihirbazdan
// farklı olarak alan (dönüm) ve sınır burada YOK — onlar haritadan gelir ve
// bu akışın kapsamı dışında bırakıldı (bkz. ParcelDrawMap).
export function EditParcelForm({ customer, parcel, kuyular }: { customer: Customer; parcel: Parcel; kuyular: Well[] }) {
  const [ad, setAd] = useState(parcel.ad);
  const [urunler, setUrunler] = useState<ParcelUrun[]>(
    parcel.urunler.length > 0 ? parcel.urunler.map((u) => ({ ...u })) : [{ urun: "", anac: "" }],
  );

  const [sulamaSekli, setSulamaSekli] = useState(parcel.sulamaSekli ?? "");
  const [sulamaDetay, setSulamaDetay] = useState(parcel.sulamaDetay ?? "");
  const [kuyuIds, setKuyuIds] = useState<string[]>(parcel.kuyuIds ?? []);
  const [kuyularListesi, setKuyularListesi] = useState<Well[]>(kuyular);
  const [kuyuFormAcik, setKuyuFormAcik] = useState(false);
  const [yeniKuyuAdi, setYeniKuyuAdi] = useState("");
  const [kuyuEkleniyor, setKuyuEkleniyor] = useState(false);

  const [siraArasi, setSiraArasi] = useState(parcel.siraArasi != null ? String(parcel.siraArasi) : "");
  const [siraUzeri, setSiraUzeri] = useState(parcel.siraUzeri != null ? String(parcel.siraUzeri) : "");
  const [agacSayisi, setAgacSayisi] = useState(parcel.agacSayisi != null ? String(parcel.agacSayisi) : "");

  async function kuyuEkle() {
    const isim = yeniKuyuAdi.trim();
    if (!isim) return;
    setKuyuEkleniyor(true);
    try {
      const fd = new FormData();
      fd.set("ad", isim);
      const yeniKuyu = await createWellAction(customer.id, fd);
      setKuyularListesi((prev) => [...prev, yeniKuyu]);
      setKuyuIds((prev) => [...prev, yeniKuyu.id]);
      setYeniKuyuAdi("");
      setKuyuFormAcik(false);
    } finally {
      setKuyuEkleniyor(false);
    }
  }

  function hesaplaAgac(arasiStr: string, uzeriStr: string) {
    const sonuc = hesaplaAgacSayisi(parcel.alanDonum, Number(arasiStr), Number(uzeriStr));
    if (sonuc !== null) setAgacSayisi(String(sonuc));
  }
  function siraArasiChange(v: string) {
    setSiraArasi(v);
    hesaplaAgac(v, siraUzeri);
  }
  function siraUzeriChange(v: string) {
    setSiraUzeri(v);
    hesaplaAgac(siraArasi, v);
  }

  const gecerliUrunler = urunler.filter((u) => u.urun.trim());
  const boundAction = updateParcelAction.bind(null, customer.id, parcel.id);

  return (
    <form action={boundAction} className="card wizard-card" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
      <section className="wizard-section">
        <h2>Temel Bilgiler</h2>
        <div className="calc-box">
          <div className="field">
            <label htmlFor="parsel-ad">
              Parsel Adı <span className="req">*</span>
            </label>
            <input id="parsel-ad" name="ad" value={ad} onChange={(e) => setAd(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="parsel-alan">Alan (dönüm)</label>
            <input id="parsel-alan" value={`${parcel.alanDonum} dönüm`} readOnly disabled />
          </div>
          <p className="calc-note">Alan ve sınır haritadan çizildi, bu formdan değiştirilemez.</p>
        </div>
      </section>

      <section className="wizard-section">
        <h2>Ürün &amp; Çeşit</h2>
        <UrunRows urunler={urunler} onChange={setUrunler} />
      </section>

      <section className="wizard-section">
        <h2>Sulama</h2>
        <div className="field">
          <label htmlFor="sulama-sekli">Sulama Şekli</label>
          <select id="sulama-sekli" value={sulamaSekli} onChange={(e) => setSulamaSekli(e.target.value)}>
            <option value="">Seçin</option>
            {SULAMA_SEKILLERI.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sulama-detay">Sulama Şekli Detay</label>
          <input
            id="sulama-detay"
            value={sulamaDetay}
            onChange={(e) => setSulamaDetay(e.target.value)}
            placeholder="Örn. Haftada 2 gün, gece sulaması"
          />
        </div>
        <div className="field">
          <label>Sulama Kuyusu</label>
          <p className="wizard-hint">Bir parsel birden fazla kuyudan sulanabilir, istediğiniz kadar seçin.</p>
          <div className="kuyu-secim-list">
            {kuyularListesi.length === 0 ? (
              <p className="well-empty-note">Henüz kuyu eklenmedi.</p>
            ) : (
              kuyularListesi.map((k) => (
                <label key={k.id} className="kuyu-secim-row">
                  <input
                    type="checkbox"
                    checked={kuyuIds.includes(k.id)}
                    onChange={(e) =>
                      setKuyuIds((prev) =>
                        e.target.checked ? Array.from(new Set([...prev, k.id])) : prev.filter((id) => id !== k.id),
                      )
                    }
                  />
                  <span>{k.ad}</span>
                </label>
              ))
            )}
          </div>
          <div className="kuyu-row">
            <button type="button" className="btn" onClick={() => setKuyuFormAcik((v) => !v)}>
              <Icon name="plus" />
              Yeni kuyu ekle
            </button>
          </div>
          {kuyuFormAcik && (
            <div className="kuyu-inline-form">
              <input
                value={yeniKuyuAdi}
                onChange={(e) => setYeniKuyuAdi(e.target.value)}
                placeholder="Kuyu adı, örn. Doğu Kuyusu"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={kuyuEkle}
                disabled={kuyuEkleniyor || !yeniKuyuAdi.trim()}
              >
                {kuyuEkleniyor ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="wizard-section">
        <h2>Ağaç Bilgisi</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="sira-arasi">Sıra Arası (m)</label>
            <input
              id="sira-arasi"
              type="number"
              min="0"
              step="0.1"
              value={siraArasi}
              onChange={(e) => siraArasiChange(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="sira-uzeri">Sıra Üzeri (m)</label>
            <input
              id="sira-uzeri"
              type="number"
              min="0"
              step="0.1"
              value={siraUzeri}
              onChange={(e) => siraUzeriChange(e.target.value)}
            />
          </div>
        </div>
        <div className="calc-box">
          <div className="field">
            <label htmlFor="agac-sayisi">Tahmini Ağaç Sayısı</label>
            <input
              id="agac-sayisi"
              type="number"
              min="0"
              value={agacSayisi}
              onChange={(e) => setAgacSayisi(e.target.value)}
              placeholder="Sıra arası ve sıra üzeri girilince hesaplanır"
            />
          </div>
          <p className="calc-note">
            Alan ({parcel.alanDonum} dönüm) ile sıra arası × sıra üzeri değerlerinden otomatik hesaplanır, gerekirse elle
            düzeltebilirsiniz.
          </p>
        </div>
      </section>

      <input type="hidden" name="urunler" value={JSON.stringify(gecerliUrunler)} readOnly />
      <input type="hidden" name="sulamaSekli" value={sulamaSekli} readOnly />
      <input type="hidden" name="sulamaDetay" value={sulamaDetay} readOnly />
      <input type="hidden" name="kuyuIds" value={JSON.stringify(kuyuIds)} readOnly />
      <input type="hidden" name="siraArasi" value={siraArasi} readOnly />
      <input type="hidden" name="siraUzeri" value={siraUzeri} readOnly />
      <input type="hidden" name="agacSayisi" value={agacSayisi} readOnly />

      <div className="form-actions">
        <Link href={`/musteriler/${customer.id}?tab=parseller`} className="btn">
          Vazgeç
        </Link>
        <button type="submit" className="btn btn-primary">
          Kaydet
        </button>
      </div>
    </form>
  );
}
