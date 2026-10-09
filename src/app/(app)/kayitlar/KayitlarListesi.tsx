"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { tipBadgeSinifi, formatKayitTarihi } from "@/lib/kayitlar";

export type KayitSatiri = {
  id: string;
  musteriId: string;
  musteriAd: string;
  parselId: string;
  parselAd: string;
  tipAd: string;
  tipIkon: string;
  ozet: string;
  tarih: string; // YYYY-MM-DD
  muhendisAd: string;
  fenolojikDonem: string;
  durum: string;
  oncelik: number | null;
  hastaliklar: string[];
  gorseller: string[];
  not: string;
  alanlar: { label: string; deger: string }[];
};

const SAYFA_BOYU = 50;

function bugunIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function gunOnce(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Kayıtlar sayfası — filtreler + satıra tıklayınca açılan detay (fotoğraflar dahil).
export function KayitlarListesi({ satirlar }: { satirlar: KayitSatiri[] }) {
  const [q, setQ] = useState("");
  const [musteri, setMusteri] = useState("");
  const [parsel, setParsel] = useState("");
  const [tip, setTip] = useState("");
  const [muhendis, setMuhendis] = useState("");
  const [hastalik, setHastalik] = useState("");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [sadeceFotolu, setSadeceFotolu] = useState(false);
  const [gorunen, setGorunen] = useState(SAYFA_BOYU);
  const [acik, setAcik] = useState<string | null>(null);
  const [buyuk, setBuyuk] = useState<{ liste: string[]; i: number } | null>(null);
  const [kirikFotolar, setKirikFotolar] = useState<Set<string>>(new Set());

  const musteriler = useMemo(() => Array.from(new Map(satirlar.map((s) => [s.musteriId, s.musteriAd])).entries()).sort((a, b) => a[1].localeCompare(b[1], "tr")), [satirlar]);
  const parseller = useMemo(
    () =>
      Array.from(new Map(satirlar.filter((s) => !musteri || s.musteriId === musteri).map((s) => [s.parselId, s.parselAd])).entries()).sort((a, b) =>
        a[1].localeCompare(b[1], "tr", { numeric: true }),
      ),
    [satirlar, musteri],
  );
  const tipler = useMemo(() => Array.from(new Set(satirlar.map((s) => s.tipAd))).sort((a, b) => a.localeCompare(b, "tr")), [satirlar]);
  const muhendisler = useMemo(() => Array.from(new Set(satirlar.map((s) => s.muhendisAd))).sort((a, b) => a.localeCompare(b, "tr")), [satirlar]);
  const hastaliklar = useMemo(() => Array.from(new Set(satirlar.flatMap((s) => s.hastaliklar))).sort((a, b) => a.localeCompare(b, "tr")), [satirlar]);

  const filtreli = useMemo(() => {
    const aranan = q.trim().toLocaleLowerCase("tr");
    return satirlar.filter((s) => {
      if (musteri && s.musteriId !== musteri) return false;
      if (parsel && s.parselId !== parsel) return false;
      if (tip && s.tipAd !== tip) return false;
      if (muhendis && s.muhendisAd !== muhendis) return false;
      if (hastalik && !s.hastaliklar.includes(hastalik)) return false;
      if (baslangic && s.tarih < baslangic) return false;
      if (bitis && s.tarih > bitis) return false;
      if (sadeceFotolu && s.gorseller.length === 0) return false;
      if (aranan) {
        const metin = [s.parselAd, s.musteriAd, s.tipAd, s.ozet, s.not, s.fenolojikDonem, s.durum, s.hastaliklar.join(" "), s.alanlar.map((a) => a.deger).join(" ")]
          .join(" ")
          .toLocaleLowerCase("tr");
        if (!metin.includes(aranan)) return false;
      }
      return true;
    });
  }, [satirlar, q, musteri, parsel, tip, muhendis, hastalik, baslangic, bitis, sadeceFotolu]);

  const filtreSayisi = [q, musteri, parsel, tip, muhendis, hastalik, baslangic, bitis].filter(Boolean).length + (sadeceFotolu ? 1 : 0);
  function temizle() {
    setQ("");
    setMusteri("");
    setParsel("");
    setTip("");
    setMuhendis("");
    setHastalik("");
    setBaslangic("");
    setBitis("");
    setSadeceFotolu(false);
    setGorunen(SAYFA_BOYU);
  }
  function hazirAralik(gun: number | null) {
    setBaslangic(gun === null ? "" : gunOnce(gun));
    setBitis(gun === null ? "" : bugunIso());
    setGorunen(SAYFA_BOYU);
  }
  const f = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setGorunen(SAYFA_BOYU);
  };

  // Büyük fotoğraf görünümü: Esc ile kapat, ok tuşlarıyla gez
  useEffect(() => {
    if (!buyuk) return;
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") setBuyuk(null);
      else if (e.key === "ArrowRight") setBuyuk((b) => (b ? { ...b, i: (b.i + 1) % b.liste.length } : b));
      else if (e.key === "ArrowLeft") setBuyuk((b) => (b ? { ...b, i: (b.i - 1 + b.liste.length) % b.liste.length } : b));
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [buyuk]);

  if (satirlar.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <Icon name="table" className="icon" />
          <p>Henüz saha kaydı yok. Bir parsel detayından &quot;Kayıt Ekle&quot; ile ilk kaydı oluşturabilirsiniz.</p>
        </div>
      </div>
    );
  }

  const goster = filtreli.slice(0, gorunen);

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">
          Tüm parsellerdeki saha kayıtları · {filtreSayisi > 0 ? `${filtreli.length} / ${satirlar.length} kayıt` : `${satirlar.length} kayıt`}
        </div>
      </div>

      <div className="card kl-filtre">
        <div className="kl-filtre-ust">
          <div className="search">
            <Icon name="search" />
            <input value={q} onChange={(e) => f(setQ)(e.target.value)} placeholder="Parsel, müşteri, not, reçete, hastalık ara…" aria-label="Kayıt ara" />
          </div>
          <div className="kl-hazir" role="group" aria-label="Hazır tarih aralığı">
            <button type="button" onClick={() => hazirAralik(7)}>Son 7 gün</button>
            <button type="button" onClick={() => hazirAralik(30)}>Son 30 gün</button>
            <button type="button" onClick={() => hazirAralik(90)}>Son 90 gün</button>
            <button type="button" onClick={() => hazirAralik(null)}>Tümü</button>
          </div>
        </div>
        <div className="kl-filtre-alt">
          <label>
            <span>Müşteri</span>
            <select
              value={musteri}
              onChange={(e) => {
                f(setMusteri)(e.target.value);
                setParsel("");
              }}
            >
              <option value="">Tümü</option>
              {musteriler.map(([id, ad]) => (
                <option key={id} value={id}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Parsel</span>
            <select value={parsel} onChange={(e) => f(setParsel)(e.target.value)}>
              <option value="">Tümü</option>
              {parseller.map(([id, ad]) => (
                <option key={id} value={id}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tip</span>
            <select value={tip} onChange={(e) => f(setTip)(e.target.value)}>
              <option value="">Tümü</option>
              {tipler.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {hastaliklar.length > 0 && (
            <label>
              <span>Hastalık / Zararlı</span>
              <select value={hastalik} onChange={(e) => f(setHastalik)(e.target.value)}>
                <option value="">Tümü</option>
                {hastaliklar.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          )}
          {muhendisler.length > 1 && (
            <label>
              <span>Mühendis</span>
              <select value={muhendis} onChange={(e) => f(setMuhendis)(e.target.value)}>
                <option value="">Tümü</option>
                {muhendisler.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Başlangıç</span>
            <input type="date" value={baslangic} onChange={(e) => f(setBaslangic)(e.target.value)} />
          </label>
          <label>
            <span>Bitiş</span>
            <input type="date" value={bitis} onChange={(e) => f(setBitis)(e.target.value)} />
          </label>
          <label className="kl-onay">
            <input type="checkbox" checked={sadeceFotolu} onChange={(e) => f(setSadeceFotolu)(e.target.checked)} />
            <span>Sadece fotoğraflılar</span>
          </label>
          {filtreSayisi > 0 && (
            <button type="button" className="btn kl-temizle" onClick={temizle}>
              Filtreleri temizle ({filtreSayisi})
            </button>
          )}
        </div>
      </div>

      {filtreli.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Icon name="search" className="icon" />
            <p>Bu filtrelere uyan kayıt yok.</p>
            <button type="button" className="btn" onClick={temizle}>
              Filtreleri temizle
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table className="data-table kl-tablo">
              <thead>
                <tr>
                  <th>Parsel</th>
                  <th>Müşteri</th>
                  <th>Tip</th>
                  <th>Özet</th>
                  <th>Tarih</th>
                  <th>Mühendis</th>
                  <th style={{ textAlign: "right" }}>Detay</th>
                </tr>
              </thead>
              <tbody>
                {goster.map((s) => {
                  const genis = acik === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr className="kl-satir" data-acik={genis} onClick={() => setAcik(genis ? null : s.id)}>
                        <td>
                          <span className="kl-parsel">{s.parselAd}</span>
                        </td>
                        <td>{s.musteriAd}</td>
                        <td>
                          <span className={`tip-badge ${tipBadgeSinifi(s.tipAd)}`}>
                            <Icon name={s.tipIkon} />
                            {s.tipAd}
                          </span>
                        </td>
                        <td style={{ color: "var(--ink-2)" }}>
                          {s.ozet}
                          {s.hastaliklar.length > 0 && <span className="kl-chip kl-chip-hastalik">{s.hastaliklar.join(", ")}</span>}
                          {s.gorseller.length > 0 && <span className="kl-chip">📎 {s.gorseller.length} fotoğraf</span>}
                        </td>
                        <td className="num">{formatKayitTarihi(s.tarih)}</td>
                        <td>{s.muhendisAd}</td>
                        <td style={{ textAlign: "right" }}>
                          <button type="button" className="icon-btn" title={genis ? "Detayı kapat" : "Detayı aç"} aria-expanded={genis} onClick={(e) => { e.stopPropagation(); setAcik(genis ? null : s.id); }}>
                            <Icon name="eye" />
                          </button>
                        </td>
                      </tr>
                      {genis && (
                        <tr className="kl-detay-satir">
                          <td colSpan={7}>
                            <div className="kl-detay">
                              <dl>
                                <div>
                                  <dt>Müşteri</dt>
                                  <dd>{s.musteriAd}</dd>
                                </div>
                                <div>
                                  <dt>Parsel</dt>
                                  <dd>{s.parselAd}</dd>
                                </div>
                                <div>
                                  <dt>Tarih</dt>
                                  <dd>{formatKayitTarihi(s.tarih)}</dd>
                                </div>
                                <div>
                                  <dt>Mühendis</dt>
                                  <dd>{s.muhendisAd}</dd>
                                </div>
                                {s.alanlar.map((a) => (
                                  <div key={a.label}>
                                    <dt>{a.label}</dt>
                                    <dd>{a.deger}</dd>
                                  </div>
                                ))}
                                {s.fenolojikDonem && (
                                  <div>
                                    <dt>Fenolojik Dönem</dt>
                                    <dd>{s.fenolojikDonem}</dd>
                                  </div>
                                )}
                                {s.durum && (
                                  <div>
                                    <dt>Durum</dt>
                                    <dd>{s.durum}</dd>
                                  </div>
                                )}
                                {s.oncelik != null && (
                                  <div>
                                    <dt>Öncelik Puanı</dt>
                                    <dd>{s.oncelik} / 10</dd>
                                  </div>
                                )}
                                {s.hastaliklar.length > 0 && (
                                  <div>
                                    <dt>Hastalık / Zararlı</dt>
                                    <dd>{s.hastaliklar.join(", ")}</dd>
                                  </div>
                                )}
                                {s.not && (
                                  <div className="kl-genis">
                                    <dt>Açıklama / Gözlem</dt>
                                    <dd className="kl-not">{s.not}</dd>
                                  </div>
                                )}
                              </dl>
                              {s.gorseller.length > 0 && (
                                <div className="kl-fotolar" aria-label="Fotoğraflar">
                                  {s.gorseller.map((yol, i) => (
                                    kirikFotolar.has(yol) ? (
                                      <div key={yol} className="kl-foto kl-foto-kirik" title={yol}>
                                        Fotoğraf dosyası bulunamadı
                                      </div>
                                    ) : (
                                      <button key={yol} type="button" className="kl-foto" onClick={() => setBuyuk({ liste: s.gorseller, i })} aria-label={`Fotoğrafı büyüt (${i + 1}/${s.gorseller.length})`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcının yüklediği serbest boyutlu fotoğraf */}
                                        <img src={yol} alt={`${s.parselAd} fotoğrafı ${i + 1}`} loading="lazy" onError={() => setKirikFotolar((o) => new Set(o).add(yol))} />
                                      </button>
                                    )
                                  ))}
                                </div>
                              )}
                              <div className="kl-detay-aksiyon">
                                <Link href={`/musteriler/${s.musteriId}?tab=ziyaret`} className="btn">
                                  Müşteri sayfasında aç / düzenle
                                </Link>
                                <Link href={`/musteriler/${s.musteriId}/parseller/${s.parselId}`} className="btn">
                                  Parsele git
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-foot kl-foot">
            <span>
              {goster.length} / {filtreli.length} kayıt gösteriliyor
            </span>
            {goster.length < filtreli.length && (
              <button type="button" className="btn" onClick={() => setGorunen((g) => g + SAYFA_BOYU)}>
                Daha fazla göster
              </button>
            )}
          </div>
        </div>
      )}

      {buyuk && (
        <div className="kl-lightbox" role="dialog" aria-modal="true" aria-label="Fotoğraf" onClick={() => setBuyuk(null)}>
          <button type="button" className="kl-lb-kapat" aria-label="Kapat" onClick={() => setBuyuk(null)}>
            ✕
          </button>
          {buyuk.liste.length > 1 && (
            <button
              type="button"
              className="kl-lb-ok kl-lb-sol"
              aria-label="Önceki fotoğraf"
              onClick={(e) => {
                e.stopPropagation();
                setBuyuk({ ...buyuk, i: (buyuk.i - 1 + buyuk.liste.length) % buyuk.liste.length });
              }}
            >
              ‹
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={buyuk.liste[buyuk.i]} alt="Büyütülmüş saha fotoğrafı" onClick={(e) => e.stopPropagation()} />
          {buyuk.liste.length > 1 && (
            <button
              type="button"
              className="kl-lb-ok kl-lb-sag"
              aria-label="Sonraki fotoğraf"
              onClick={(e) => {
                e.stopPropagation();
                setBuyuk({ ...buyuk, i: (buyuk.i + 1) % buyuk.liste.length });
              }}
            >
              ›
            </button>
          )}
          <span className="kl-lb-sayac">
            {buyuk.i + 1} / {buyuk.liste.length}
          </span>
        </div>
      )}
    </>
  );
}
