"use client";

import { useState } from "react";
import Link from "next/link";
import { createParcelAction } from "@/lib/actions";
import { ParcelBoundaryPicker } from "@/components/map/ParcelBoundaryPicker";
import { Icon } from "@/components/IconSprite";
import { UrunRows } from "@/components/UrunRows";
import { SULAMA_SEKILLERI, hesaplaAgacSayisi } from "@/lib/parcelForm";
import type { Customer, LatLng, ParcelUrun } from "@/types";

const ADIMLAR = [
  "Temel Bilgiler",
  "Ürün & Çeşit",
  "Sulama",
  "Ağaç Bilgisi",
  "Özet",
];

export function ParselEkleWizard({ customer }: { customer: Customer }) {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);

  // Adım 1 — Temel Bilgiler
  const [sinir, setSinir] = useState<LatLng[] | null>(null);
  const [alanDonum, setAlanDonum] = useState(0);
  const [haritaTamam, setHaritaTamam] = useState(false);
  const [ad, setAd] = useState("");

  // Adım 2 — Ürün & Çeşit
  const [urunler, setUrunler] = useState<ParcelUrun[]>([{ urun: "", anac: "" }]);

  // Adım 3 — Sulama
  const [sulamaSekli, setSulamaSekli] = useState("");

  // Adım 4 — Ağaç Bilgisi
  const [siraArasi, setSiraArasi] = useState("");
  const [siraUzeri, setSiraUzeri] = useState("");
  const [agacSayisi, setAgacSayisi] = useState("");

  function gitAdim(hedef: number) {
    if (hedef > maxStep) return;
    setStep(hedef);
  }

  function ileri() {
    const hedef = Math.min(5, step + 1);
    setStep(hedef);
    setMaxStep((m) => Math.max(m, hedef));
  }

  function geri() {
    setStep((s) => Math.max(1, s - 1));
  }

  function haritaDevamEt(yeniSinir: LatLng[], yeniAlan: number) {
    setSinir(yeniSinir);
    setAlanDonum(yeniAlan);
    setHaritaTamam(true);
  }

  function hesaplaAgac(arasiStr: string, uzeriStr: string) {
    const sonuc = hesaplaAgacSayisi(alanDonum, Number(arasiStr), Number(uzeriStr));
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

  const step1Tamam = ad.trim().length > 0;
  const step2Tamam = gecerliUrunler.length > 0;

  const ilerleyebilir =
    (step === 1 && step1Tamam) ||
    (step === 2 && step2Tamam) ||
    step === 3 ||
    step === 4;

  const boundParcelAction = createParcelAction.bind(null, customer.id);

  return (
    <div className="builder-layout">
      <div className="builder-main">
        <ol className="stepper">
          {ADIMLAR.map((label, i) => {
            const n = i + 1;
            const durum = n === step ? "active" : n < step ? "done" : n <= maxStep ? "visited" : "upcoming";
            return (
              <li key={label} className="stepper-item" data-state={durum}>
                <button type="button" onClick={() => gitAdim(n)} disabled={n > maxStep}>
                  <span className="stepper-dot">{n < step ? <Icon name="chevron-r" /> : n}</span>
                  <span className="stepper-label">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="card wizard-card">
          <div className="wizard-step" key={step}>
            {step === 1 && (
              <section className="wizard-section">
                <h2>Temel Bilgiler</h2>
                <p className="wizard-hint">Parsel sınırını haritadan çizebilirsiniz — alan otomatik hesaplanır. Çizmeden de devam edebilirsiniz.</p>
                <div className="map-shell">
                  <ParcelBoundaryPicker initialSinir={sinir ?? undefined} onDevamEt={haritaDevamEt} />
                </div>
                <div className="sinir-info" data-state={haritaTamam ? "cizildi" : "cizilmedi"}>
                  <Icon name={haritaTamam ? "check" : "map"} />
                  <div>
                    {haritaTamam ? (
                      <>
                        <strong>Sınır çizildi.</strong> Alan haritadan otomatik hesaplandı; parsel haritada görünür, toprak nemi
                        eşleştirmesi ve ısı günlüğü kayıttan sonra otomatik başlar.
                      </>
                    ) : (
                      <>
                        <strong>Sınır çizmeden de devam edebilirsiniz.</strong> Bu durumda alanı elle girersiniz; parsel haritada
                        görünmez, toprak nemi eşleştirmesi ve ısı günlüğü çalışmaz. Sınırı daha sonra parsel sayfasından
                        çizebilirsiniz, bu özellikler o zaman devreye girer.
                      </>
                    )}
                  </div>
                </div>
                <div className="calc-box">
                  <div className="field">
                    <label htmlFor="parsel-ad">
                      Parsel Adı <span className="req">*</span>
                    </label>
                    <input
                      id="parsel-ad"
                      value={ad}
                      onChange={(e) => setAd(e.target.value)}
                      placeholder="Örn. Kuzey Parseli"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="parsel-alan">Alan (dönüm)</label>
                    {haritaTamam ? (
                      <input id="parsel-alan" value={`${alanDonum} dönüm`} readOnly disabled />
                    ) : (
                      <input
                        id="parsel-alan"
                        type="number"
                        min="0"
                        step="0.1"
                        value={alanDonum || ""}
                        onChange={(e) => setAlanDonum(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="Biliyorsanız girin"
                      />
                    )}
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="wizard-section">
                <h2>Ürün &amp; Çeşit</h2>
                <p className="wizard-hint">Parselde yetiştirilen ürünleri ve varsa anaçlarını ekleyin.</p>
                <UrunRows urunler={urunler} onChange={setUrunler} />
              </section>
            )}

            {step === 3 && (
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
              </section>
            )}

            {step === 4 && (
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
                    Alan ({alanDonum} dönüm) ile sıra arası × sıra üzeri değerlerinden otomatik hesaplanır, gerekirse elle düzeltebilirsiniz.
                  </p>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="wizard-section">
                <h2>Özet</h2>
                <div className="summary-section">
                  <div className="summary-head">
                    <h3>Temel Bilgiler</h3>
                    <button type="button" className="summary-edit" onClick={() => gitAdim(1)}>
                      Düzenle
                    </button>
                  </div>
                  <div className="summary-row">
                    <span className="k">Parsel Adı</span>
                    <span className="v">{ad || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span className="k">Alan</span>
                    <span className="v">{alanDonum} dönüm</span>
                  </div>
                </div>

                <div className="summary-section">
                  <div className="summary-head">
                    <h3>Ürün &amp; Çeşit</h3>
                    <button type="button" className="summary-edit" onClick={() => gitAdim(2)}>
                      Düzenle
                    </button>
                  </div>
                  {gecerliUrunler.length === 0 ? (
                    <div className="summary-row">
                      <span className="v muted">Ürün girilmedi</span>
                    </div>
                  ) : (
                    gecerliUrunler.map((u, i) => (
                      <div className="summary-row" key={i}>
                        <span className="k">{u.urun}</span>
                        <span className="v">{u.anac || "Anaç belirtilmedi"}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="summary-section">
                  <div className="summary-head">
                    <h3>Sulama</h3>
                    <button type="button" className="summary-edit" onClick={() => gitAdim(3)}>
                      Düzenle
                    </button>
                  </div>
                  <div className="summary-row">
                    <span className="k">Sulama Şekli</span>
                    <span className="v">{sulamaSekli || "Belirtilmedi"}</span>
                  </div>
                </div>

                <div className="summary-section">
                  <div className="summary-head">
                    <h3>Ağaç Bilgisi</h3>
                    <button type="button" className="summary-edit" onClick={() => gitAdim(4)}>
                      Düzenle
                    </button>
                  </div>
                  <div className="summary-row">
                    <span className="k">Sıra Arası × Sıra Üzeri</span>
                    <span className="v">
                      {siraArasi || "—"} m × {siraUzeri || "—"} m
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="k">Ağaç Sayısı</span>
                    <span className="v">{agacSayisi || "—"}</span>
                  </div>
                </div>

                <form action={boundParcelAction} className="wizard-submit-form">
                  <input type="hidden" name="ad" value={ad} readOnly />
                  <input type="hidden" name="alanDonum" value={alanDonum} readOnly />
                  <input type="hidden" name="sinir" value={sinir ? JSON.stringify(sinir) : ""} readOnly />
                  <input type="hidden" name="urunler" value={JSON.stringify(gecerliUrunler)} readOnly />
                  <input type="hidden" name="sulamaSekli" value={sulamaSekli} readOnly />
                  <input type="hidden" name="siraArasi" value={siraArasi} readOnly />
                  <input type="hidden" name="siraUzeri" value={siraUzeri} readOnly />
                  <input type="hidden" name="agacSayisi" value={agacSayisi} readOnly />
                  <div className="form-actions">
                    <Link href={`/musteriler/${customer.id}`} className="btn">
                      Vazgeç
                    </Link>
                    <button type="submit" className="btn btn-primary">
                      Parseli Kaydet
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>

          {step !== 5 && (
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={geri} disabled={step === 1}>
                ← Geri
              </button>
              <button type="button" className="btn btn-primary" onClick={ileri} disabled={!ilerleyebilir}>
                İleri →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="side-card">
        <div className="card">
          <h3>Canlı önizleme</h3>
          <div className="stat-list">
            <div className="stat-row">
              <span className="k">Parsel Adı</span>
              <span className="v" style={{ fontFamily: "inherit" }}>
                {ad || "—"}
              </span>
            </div>
            <div className="stat-row">
              <span className="k">Alan</span>
              <span className="v">{alanDonum} dönüm</span>
            </div>
            <div className="stat-row">
              <span className="k">Ürün / Çeşit</span>
              <span className="v">{gecerliUrunler.length}</span>
            </div>
            <div className="stat-row">
              <span className="k">Sulama Şekli</span>
              <span className="v" style={{ fontFamily: "inherit" }}>
                {sulamaSekli || "—"}
              </span>
            </div>
            <div className="stat-row">
              <span className="k">Ağaç Sayısı</span>
              <span className="v">{agacSayisi || "—"}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>İpuçları</h3>
          <div className="tip-list">
            <div className="tip-item">
              <span className="tip-num">1</span>Sınırı çizerken son noktaya tekrar tıklayarak çokgeni kapatın.
            </div>
            <div className="tip-item">
              <span className="tip-num">2</span>Ağaç sayısı sıra arası/üzeri girilince otomatik hesaplanır, gerekirse elle düzeltin.
            </div>
            <div className="tip-item">
              <span className="tip-num">3</span>Adımlar arasında ileri geri gezinip özet ekranından düzenleyebilirsiniz.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
