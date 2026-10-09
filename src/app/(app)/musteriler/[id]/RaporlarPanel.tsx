"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { DisaAktarButton } from "@/components/DisaAktarButton";
import { konteynerdenTablolariTopla } from "@/lib/disaAktar";
import { formatKisaTarih, formatUzunTarih } from "@/lib/toprakMock";
import { olcekle, cizgiPath } from "@/lib/chartMath";
import {
  haftaBaslangiciBul,
  haftaBitisiBul,
  haftalikOzetHesapla,
  haftalikRaporVerisiHazirla,
} from "@/lib/haftalikRapor";
import { oncelikSinifi } from "@/lib/kayitlar";
import { ZIYARET_DURUM_SECENEKLERI } from "@/lib/tarim";
import type { Customer, Parcel, FieldRecord, RecordTypeDef, Gorev, HavaGunlukOzet } from "@/types";

type Gorunum = "ozet" | "haftalik" | "gunluk";

const HAFTA_SAYISI_OZET = 8;

function gunEkle(tarih: string, adet: number): string {
  const gun = new Date(tarih + "T00:00:00Z");
  gun.setUTCDate(gun.getUTCDate() + adet);
  return gun.toISOString().slice(0, 10);
}

// "21 – 27 Eylül" (aynı ay) / "31 Ağu – 6 Eylül" (ay değişiyor) formatı.
function formatHaftaAraligi(baslangic: string, bitis: string): string {
  const b = new Date(baslangic + "T00:00:00Z");
  const s = new Date(bitis + "T00:00:00Z");
  const bGun = b.toLocaleDateString("tr-TR", { day: "numeric", timeZone: "UTC" });
  const sGunAy = s.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
  const bAyKisa = b.toLocaleDateString("tr-TR", { month: "short", timeZone: "UTC" });
  const sAyKisa = s.toLocaleDateString("tr-TR", { month: "short", timeZone: "UTC" });
  if (bAyKisa === sAyKisa) return `${bGun} – ${sGunAy}`;
  return `${bGun} ${bAyKisa} – ${sGunAy}`;
}

function sayiFormat(n: number | null, birim = ""): string {
  if (n === null) return "—";
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}${birim}`;
}

// Sulama ızgarası hücre yoğunluğu — h0 (0 sa), h1 (0-2 sa), h2 (2-4 sa), h3 (4+ sa).
function sulamaYogunlukSinifi(saat: number): "h0" | "h1" | "h2" | "h3" {
  if (saat <= 0) return "h0";
  if (saat < 2) return "h1";
  if (saat < 4) return "h2";
  return "h3";
}

function trendSinifi(bu: number, gecen: number): "trend-up" | "trend-down" | "trend-eq" {
  if (bu > gecen) return "trend-up";
  if (bu < gecen) return "trend-down";
  return "trend-eq";
}

function trendOku(bu: number, gecen: number): string {
  if (bu > gecen) return "Artış";
  if (bu < gecen) return "Azalış";
  return "—";
}

export function RaporlarPanel({
  customer,
  parcels,
  records,
  recordTypes,
  gorevler,
  havaVerileri,
}: {
  customer: Customer;
  parcels: Parcel[];
  records: FieldRecord[];
  recordTypes: RecordTypeDef[];
  gorevler: Gorev[];
  havaVerileri: Record<string, HavaGunlukOzet[] | null>;
}) {
  const [gorunum, setGorunum] = useState<Gorunum>("ozet");
  const bugunIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [secilenHaftaBaslangic, setSecilenHaftaBaslangic] = useState(() => haftaBaslangiciBul(bugunIso));
  const [secilenParcelIds, setSecilenParcelIds] = useState<Set<string>>(() => new Set(parcels.map((p) => p.id)));
  const [secilenGun, setSecilenGun] = useState(bugunIso);

  const ozetHaftalari = useMemo(
    () =>
      haftalikOzetHesapla({
        parcels,
        havaVerileri,
        records,
        recordTypes,
        gorevler,
        haftaSayisi: HAFTA_SAYISI_OZET,
        bugun: bugunIso,
      }),
    [parcels, havaVerileri, records, recordTypes, gorevler, bugunIso],
  );
  // Tabloda en yeni hafta üstte gösterilir; grafiklerde kronolojik (eskiden
  // yeniye) sıra korunur — bkz. haftalikRapor.ts'teki fonksiyon notu.
  const ozetTablosuHaftalar = useMemo(() => ozetHaftalari.slice().reverse(), [ozetHaftalari]);

  const haftaBitis = haftaBitisiBul(secilenHaftaBaslangic);
  const haftalikVeri = useMemo(
    () =>
      haftalikRaporVerisiHazirla({
        haftaBaslangic: secilenHaftaBaslangic,
        parcelIds: Array.from(secilenParcelIds),
        parcels,
        havaVerileri,
        records,
        recordTypes,
        gorevler,
      }),
    [secilenHaftaBaslangic, secilenParcelIds, parcels, havaVerileri, records, recordTypes, gorevler],
  );

  // Günlük Saha Kaydı — "Özekenci Çiftlik Haftalık Rapor" Excel'indeki
  // "📊 Rapor" sayfasının mantığı: seçilen GÜNDE hangi parsellerde kayıt
  // girilmişse hepsi bir arada. Yeni veri girişi yok, mevcut records'tan
  // türetilir. Aynı ziyarette birden çok kayıt tipi (İlaçlama/Gübreleme/...)
  // oluşabildiği için not/durum/fenolojikDonem/oncelikPuani ortak alanlar
  // (createZiyaretKaydiAction'da hepsine aynı şekilde yazılır) — ilk kayıttan
  // okunur; reçete ise sadece İlaçlama tipi kayıtta olur, ayrı aranır.
  const ilacTuru = useMemo(() => recordTypes.find((t) => t.ad === "İlaçlama"), [recordTypes]);
  const gunlukSatirlar = useMemo(() => {
    return parcels
      .map((parcel, index) => {
        const gununKayitlari = records.filter((r) => r.parcelId === parcel.id && r.tarih === secilenGun);
        if (gununKayitlari.length === 0) return null;
        const anaKayit = gununKayitlari[0]!;
        const ilacKaydi = gununKayitlari.find((r) => r.recordTypeId === ilacTuru?.id);
        return {
          no: index + 1,
          parcel,
          durum: anaKayit.durum || "",
          gozlem: [anaKayit.not, anaKayit.hastaliklar?.length ? `Hastalık/Zararlı: ${anaKayit.hastaliklar.join(", ")}` : ""].filter(Boolean).join(" — "),
          recete: (ilacKaydi?.values?.recete as string) || "",
          donem: anaKayit.fenolojikDonem || "",
          oncelikPuani: anaKayit.oncelikPuani ?? null,
        };
      })
      .filter((satir): satir is NonNullable<typeof satir> => satir !== null);
  }, [parcels, records, secilenGun, ilacTuru]);

  function parselSecimiDegistir(parcelId: string, secili: boolean) {
    setSecilenParcelIds((onceki) => {
      const yeni = new Set(onceki);
      if (secili) yeni.add(parcelId);
      else yeni.delete(parcelId);
      return yeni;
    });
  }

  const gorunumIcerikRef = useRef<HTMLDivElement>(null);
  const gorunumBilgisi: Record<Gorunum, { dosyaAdi: string; baslik: string }> = {
    ozet: { dosyaAdi: `${customer.ad} - Ozet Rapor`, baslik: `${customer.ad} — Özet Rapor` },
    haftalik: {
      dosyaAdi: `${customer.ad} - Haftalik Rapor ${secilenHaftaBaslangic}`,
      baslik: `${customer.ad} — Haftalık Rapor (${formatUzunTarih(secilenHaftaBaslangic)} – ${formatUzunTarih(haftaBitis)})`,
    },
    gunluk: { dosyaAdi: `${customer.ad} - Gunluk Saha Kaydi ${secilenGun}`, baslik: `${customer.ad} — Günlük Saha Kaydı ${secilenGun}` },
  };

  return (
    <div className="card rapor-kart">
      <div className="rapor-head">
        <div>
          <h3>Raporlar</h3>
          <div className="sub">Yeni veri girişi yok — mevcut Isı Toplamı, Kayıtlar ve Görevler verisinden otomatik üretilir.</div>
        </div>
        <div className="rapor-head-actions">
          <div className="gorunum-pills" role="group" aria-label="Rapor görünümü">
            <button type="button" className={gorunum === "ozet" ? "active" : ""} onClick={() => setGorunum("ozet")}>
              Özet
            </button>
            <button type="button" className={gorunum === "haftalik" ? "active" : ""} onClick={() => setGorunum("haftalik")}>
              Haftalık Rapor
            </button>
            <button type="button" className={gorunum === "gunluk" ? "active" : ""} onClick={() => setGorunum("gunluk")}>
              Günlük Saha Kaydı
            </button>
          </div>
          <DisaAktarButton
            dosyaAdi={gorunumBilgisi[gorunum].dosyaAdi}
            belgeBasligi={gorunumBilgisi[gorunum].baslik}
            tablolariGetir={() => (gorunumIcerikRef.current ? konteynerdenTablolariTopla(gorunumIcerikRef.current) : [])}
          />
        </div>
      </div>

      <div ref={gorunumIcerikRef}>
      {gorunum === "ozet" ? (
        <OzetGorunumu haftalar={ozetHaftalari} tabloHaftalari={ozetTablosuHaftalar} />
      ) : gorunum === "haftalik" ? (
        <HaftalikRaporGorunumu
          customer={customer}
          parcels={parcels}
          secilenHaftaBaslangic={secilenHaftaBaslangic}
          haftaBitis={haftaBitis}
          secilenParcelIds={secilenParcelIds}
          veri={haftalikVeri}
          onHaftaDegistir={(adet) => setSecilenHaftaBaslangic((g) => gunEkle(g, adet))}
          onParselSecimiDegistir={parselSecimiDegistir}
        />
      ) : (
        <GunlukSahaKaydiGorunumu
          secilenGun={secilenGun}
          onGunDegistir={(adet) => setSecilenGun((g) => gunEkle(g, adet))}
          satirlar={gunlukSatirlar}
          toplamParselSayisi={parcels.length}
        />
      )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------
// Özet görünümü
// ------------------------------------------------------------------------

function OzetGorunumu({
  haftalar,
  tabloHaftalari,
}: {
  haftalar: ReturnType<typeof haftalikOzetHesapla>;
  tabloHaftalari: ReturnType<typeof haftalikOzetHesapla>;
}) {
  const veriVarMi = haftalar.some(
    (h) => h.haftalikGdd !== null || h.sulamaSaat > 0 || h.gubreUygulama > 0 || h.yaprakGubresi > 0 || h.ilacUygulama > 0 || h.sahaTespiti > 0,
  );

  return (
    <>
      <div className="ozet-charts">
        <div className="ozet-chart-col">
          <div className="ozet-chart-head">Haftalık GDD</div>
          <div className="ozet-chart-sub">Son {haftalar.length} hafta, müşterinin tüm parsellerinin ortalaması</div>
          <GddCizgiGrafik haftalar={haftalar} />
        </div>
        <div className="ozet-chart-col">
          <div className="ozet-chart-head">Haftalık Uygulama Sayıları</div>
          <div className="ozet-chart-sub">Gübreleme / Yaprak Gübresi / İlaçlama</div>
          <UygulamaCubukGrafik haftalar={haftalar} />
          <div className="legend-row">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "var(--brand-deep)" }} />
              Gübreleme
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "var(--good)" }} />
              Yaprak Gübresi
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "var(--amber)" }} />
              İlaçlama
            </span>
          </div>
        </div>
      </div>

      {!veriVarMi && (
        <p className="rapor-bos-not">
          Görüntülenen {haftalar.length} haftada henüz kayıt/görev girilmemiş — tablodaki sıfırlar bunu yansıtıyor.
        </p>
      )}

      <div className="table-scroll">
        <table className="ozet-table">
          <thead>
            <tr>
              <th>Hafta</th>
              <th>Ort. Sıcaklık</th>
              <th>Haftalık GDD</th>
              <th>Kümülatif GDD</th>
              <th>Sulama</th>
              <th>Gübreleme</th>
              <th>Yaprak Gübresi</th>
              <th>İlaçlama</th>
              <th>Saha Tespiti</th>
            </tr>
          </thead>
          <tbody>
            {tabloHaftalari.map((hafta) => (
              <tr key={hafta.haftaBaslangic}>
                <td>{formatHaftaAraligi(hafta.haftaBaslangic, hafta.haftaBitis)}</td>
                <td>{hafta.ortSicaklik !== null ? `${sayiFormat(hafta.ortSicaklik)}°C` : "—"}</td>
                <td className="gdd-cell">{sayiFormat(hafta.haftalikGdd)}</td>
                <td className="gdd-cell">{sayiFormat(hafta.kumulatifGdd)}</td>
                <td>{hafta.sulamaSaat > 0 ? `${sayiFormat(hafta.sulamaSaat)} sa · ${hafta.sulamaGunu} gün` : "—"}</td>
                <td>
                  <span className={`count-pill${hafta.gubreUygulama > 0 ? " var" : " zero"}`}>{hafta.gubreUygulama}</span>
                </td>
                <td>
                  <span className={`count-pill${hafta.yaprakGubresi > 0 ? " var" : " zero"}`}>{hafta.yaprakGubresi}</span>
                </td>
                <td>
                  <span className={`count-pill${hafta.ilacUygulama > 0 ? " var" : " zero"}`}>{hafta.ilacUygulama}</span>
                </td>
                <td>
                  <span className={`count-pill${hafta.sahaTespiti > 0 ? " gorev-pill" : " zero"}`}>{hafta.sahaTespiti}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rapor-footnote">
        Grafikler tablonun üzerinde bir özet sunar — asıl kaynak veri her zaman tablodadır. Sıcaklık/GDD, müşterinin topraq.ai eşleşmesi
        olan parsellerinin haftalık ortalamasıdır.
      </div>
    </>
  );
}

const CHART_W = 460;
const CHART_H = 130;
const CHART_PAD_L = 34;
const CHART_PAD_R = 14;
const CHART_PAD_T = 12;
const CHART_PAD_B = 24;

function GddCizgiGrafik({ haftalar }: { haftalar: ReturnType<typeof haftalikOzetHesapla> }) {
  const degerler = haftalar.map((h) => h.haftalikGdd ?? 0);
  const maxY = Math.max(...degerler, 10) * 1.1;
  const xler = haftalar.map((_, i) => olcekle(i, 0, Math.max(haftalar.length - 1, 1), CHART_PAD_L, CHART_W - CHART_PAD_R));
  const noktalar = haftalar.map((h, i) => ({
    x: xler[i],
    y: h.haftalikGdd !== null ? olcekle(h.haftalikGdd, 0, maxY, CHART_H - CHART_PAD_B, CHART_PAD_T) : CHART_H - CHART_PAD_B,
  }));
  const alanPath =
    noktalar.length > 0
      ? `M${noktalar[0].x.toFixed(2)},${(CHART_H - CHART_PAD_B).toFixed(2)} ${noktalar
          .map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(" ")} L${noktalar[noktalar.length - 1].x.toFixed(2)},${(CHART_H - CHART_PAD_B).toFixed(2)} Z`
      : "";

  return (
    <svg className="chart-svg" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {[0, 1, 2].map((i) => {
        const y = CHART_PAD_T + (i * (CHART_H - CHART_PAD_T - CHART_PAD_B)) / 2;
        const val = maxY - (i * maxY) / 2;
        return (
          <g key={i}>
            <line className="gl" x1={CHART_PAD_L} x2={CHART_W - CHART_PAD_R} y1={y} y2={y} />
            <text className="ax" x={CHART_PAD_L - 8} y={y + 3} textAnchor="end">
              {Math.round(val)}
            </text>
          </g>
        );
      })}
      <path d={alanPath} fill="var(--brand)" opacity={0.1} stroke="none" />
      <path d={cizgiPath(noktalar)} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {noktalar.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--brand)" />
      ))}
      {haftalar.map((h, i) =>
        i === 0 || i === haftalar.length - 1 || i === Math.floor(haftalar.length / 2) ? (
          <text key={h.haftaBaslangic} className="ax" x={xler[i]} y={CHART_H - 4} textAnchor="middle">
            {formatKisaTarih(h.haftaBaslangic)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function UygulamaCubukGrafik({ haftalar }: { haftalar: ReturnType<typeof haftalikOzetHesapla> }) {
  // En az 2 tavanlı — tek uygulamalık haftalarda bile eksen etiketleri
  // (yuvarlama nedeniyle) tekrar etmesin diye.
  const rawMax = Math.max(...haftalar.flatMap((h) => [h.gubreUygulama, h.yaprakGubresi, h.ilacUygulama]));
  const maxDeger = Math.max(Math.ceil(rawMax), 2);
  const grupGenisligi = (CHART_W - CHART_PAD_L - CHART_PAD_R) / haftalar.length;
  const barGenisligi = Math.min(11, grupGenisligi / 5);

  function barYuksekligi(deger: number) {
    if (deger <= 0) return 0;
    return olcekle(deger, 0, maxDeger, 0, CHART_H - CHART_PAD_T - CHART_PAD_B);
  }

  return (
    <svg className="chart-svg" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {[0, 1, 2].map((i) => {
        const y = CHART_PAD_T + (i * (CHART_H - CHART_PAD_T - CHART_PAD_B)) / 2;
        const val = maxDeger - (i * maxDeger) / 2;
        return (
          <g key={i}>
            <line className="gl" x1={CHART_PAD_L} x2={CHART_W - CHART_PAD_R} y1={y} y2={y} />
            <text className="ax" x={CHART_PAD_L - 8} y={y + 3} textAnchor="end">
              {Math.round(val)}
            </text>
          </g>
        );
      })}
      {haftalar.map((h, i) => {
        const grupX = CHART_PAD_L + i * grupGenisligi + grupGenisligi / 2 - (barGenisligi * 3) / 2;
        const seriler: [number, string][] = [
          [h.gubreUygulama, "var(--brand-deep)"],
          [h.yaprakGubresi, "var(--good)"],
          [h.ilacUygulama, "var(--amber)"],
        ];
        return (
          <g key={h.haftaBaslangic}>
            {seriler.map(([deger, renk], j) => {
              const yukseklik = barYuksekligi(deger);
              return (
                <rect
                  key={j}
                  x={grupX + j * barGenisligi}
                  y={CHART_H - CHART_PAD_B - yukseklik}
                  width={barGenisligi - 1.5}
                  height={yukseklik}
                  fill={renk}
                />
              );
            })}
          </g>
        );
      })}
      {haftalar.map((h, i) =>
        i === 0 || i === haftalar.length - 1 || i === Math.floor(haftalar.length / 2) ? (
          <text
            key={h.haftaBaslangic}
            className="ax"
            x={CHART_PAD_L + i * grupGenisligi + grupGenisligi / 2}
            y={CHART_H - 4}
            textAnchor="middle"
          >
            {formatKisaTarih(h.haftaBaslangic)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

// ------------------------------------------------------------------------
// Haftalık Rapor görünümü
// ------------------------------------------------------------------------

function HaftalikRaporGorunumu({
  customer,
  parcels,
  secilenHaftaBaslangic,
  haftaBitis,
  secilenParcelIds,
  veri,
  onHaftaDegistir,
  onParselSecimiDegistir,
}: {
  customer: Customer;
  parcels: Parcel[];
  secilenHaftaBaslangic: string;
  haftaBitis: string;
  secilenParcelIds: Set<string>;
  veri: ReturnType<typeof haftalikRaporVerisiHazirla>;
  onHaftaDegistir: (adet: number) => void;
  onParselSecimiDegistir: (parcelId: string, secili: boolean) => void;
}) {
  return (
    <>
      <div className="hr-toolbar">
        <div className="hr-field">
          <label>Hafta</label>
          <div className="gun-secici">
            <button type="button" aria-label="önceki hafta" onClick={() => onHaftaDegistir(-7)}>
              <Icon name="chevron-l" />
            </button>
            <span className="hafta-val">{formatUzunTarih(secilenHaftaBaslangic)} – {formatUzunTarih(haftaBitis)}</span>
            <button type="button" aria-label="sonraki hafta" onClick={() => onHaftaDegistir(7)}>
              <Icon name="chevron-r" />
            </button>
          </div>
        </div>

        {parcels.length > 0 && (
          <div className="hr-field">
            <label>Parsel(ler)</label>
            <div className="parsel-secim">
              {parcels.map((parcel) => {
                const secili = secilenParcelIds.has(parcel.id);
                return (
                  <label key={parcel.id} className={secili ? "secili" : ""}>
                    <input
                      type="checkbox"
                      checked={secili}
                      onChange={(e) => onParselSecimiDegistir(parcel.id, e.target.checked)}
                    />
                    {parcel.ad}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {secilenParcelIds.size === 0 ? (
        <div className="card empty-state" style={{ margin: "0 24px 24px", border: "1px dashed var(--line)" }}>
          <p>Rapor oluşturmak için en az bir parsel seçin.</p>
        </div>
      ) : (
        <div className="hr-doc">
          <IklimBolumu veri={veri} />
          <UygulamaBolumu
            baslik="Toprak Gübreleme"
            className="gubre"
            satirlar={veri.gubreSatirlari}
            renkFields={["gubreTuru", "doz", "birim", "uygulamaSekli", "amac"]}
          />
          <UygulamaBolumu
            baslik="Yaprak Gübresi"
            className="yaprak"
            satirlar={veri.yaprakSatirlari}
            renkFields={["urunAdi", "etkenIcerik", "doz", "birim", "yontem", "amac"]}
          />
          <UygulamaBolumu
            baslik="İlaçlama"
            className="ilac"
            satirlar={veri.ilacSatirlari}
            renkFields={["etkenMadde", "ticariAd", "doz", "birim", "hedef", "uygulamaDetayi", "recete"]}
          />
          <SulamaBolumu veri={veri} />
          <GozlemBolumu veri={veri} />
          <DegerlendirmeBolumu veri={veri} customerAdi={customer.ad} />
        </div>
      )}
      <div className="rapor-footnote">
        Hücre rengi sulama ızgarasında o günkü saatin yoğunluğunu gösterir (açık → koyu teal) — sayı zaten hücrede yazıyor, renk sadece
        göze çarpanı hızlandırır.
      </div>
    </>
  );
}

// ------------------------------------------------------------------------
// Günlük Saha Kaydı görünümü
// ------------------------------------------------------------------------

const DURUM_ETIKETLERI = new Map(ZIYARET_DURUM_SECENEKLERI.map((d) => [d.value, d.label]));

// ZIYARET_DURUM_SECENEKLERI'ndeki 8 değeri 4 renk bandına indirger — Durum
// alanı Ziyaret Kaydı formunda serbest seçilebildiği için burada anlamına
// göre grupluyoruz (acil/kritik → crit, bekliyor/toplantı → amber,
// devam eden/takip → brand, tamamlandı → good).
function durumSinifi(durum: string): "acil" | "bekliyor" | "takip" | "tamamlandi" | "yok" {
  if (durum === "acil" || durum === "kritik") return "acil";
  if (durum === "bekliyor" || durum === "toplanti_gerekli") return "bekliyor";
  if (durum === "tamamlandi") return "tamamlandi";
  if (durum === "planlandi" || durum === "devam_ediyor" || durum === "takip_ediliyor") return "takip";
  return "yok";
}

interface GunlukSatir {
  no: number;
  parcel: Parcel;
  durum: string;
  gozlem: string;
  recete: string;
  donem: string;
  oncelikPuani: number | null;
}

function GunlukSahaKaydiGorunumu({
  secilenGun,
  onGunDegistir,
  satirlar,
  toplamParselSayisi,
}: {
  secilenGun: string;
  onGunDegistir: (adet: number) => void;
  satirlar: GunlukSatir[];
  toplamParselSayisi: number;
}) {
  return (
    <>
      <div className="gsk-toolbar">
        <div className="gsk-tarih">
          <button type="button" aria-label="önceki gün" onClick={() => onGunDegistir(-1)}>
            <Icon name="chevron-l" />
          </button>
          <span className="gsk-tarih-deger">{formatUzunTarih(secilenGun)}</span>
          <button type="button" aria-label="sonraki gün" onClick={() => onGunDegistir(1)}>
            <Icon name="chevron-r" />
          </button>
        </div>
        <div className="gsk-ozet-sayac">
          <b>{satirlar.length}</b> parselde kayıt var · toplam <b>{toplamParselSayisi}</b> parselden
        </div>
      </div>

      {satirlar.length === 0 ? (
        <div className="gsk-bos-satir">Bu tarihte hiçbir parselde kayıt girilmemiş.</div>
      ) : (
        <div className="gsk-table-wrap">
          <table className="gsk-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Parsel</th>
                <th>Durum</th>
                <th>Gözlem / Açıklama</th>
                <th>Reçete</th>
                <th>Dönem</th>
                <th>Öncelik</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((satir) => (
                <tr key={satir.parcel.id}>
                  <td className="gsk-no">{satir.no}</td>
                  <td className="gsk-parsel">{satir.parcel.ad}</td>
                  <td>
                    <span className={`gsk-durum ${durumSinifi(satir.durum)}`}>
                      {satir.durum ? (DURUM_ETIKETLERI.get(satir.durum) ?? satir.durum) : "—"}
                    </span>
                  </td>
                  <td className="gsk-gozlem">{satir.gozlem || "—"}</td>
                  <td className="gsk-recete">{satir.recete || "—"}</td>
                  <td className="gsk-donem">{satir.donem || "—"}</td>
                  <td>
                    {satir.oncelikPuani != null ? (
                      <span className={`gsk-oncelik ${oncelikSinifi(satir.oncelikPuani)}`}>{satir.oncelikPuani}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function IklimBolumu({ veri }: { veri: ReturnType<typeof haftalikRaporVerisiHazirla> }) {
  return (
    <div className="hr-section" style={{ marginTop: 0 }}>
      <div className="hr-section-head iklim">Isı Toplamı / İklim</div>
      {veri.parselIklim.length === 0 ? (
        <p className="hr-bos-not">Seçili parseller için topraq.ai hava verisi yok.</p>
      ) : (
        <div className="table-scroll">
          <table className="trend-table hr-table">
            <thead>
              <tr>
                <th>Parsel</th>
                <th>Ort. Sıcaklık</th>
                <th>Min / Maks</th>
                <th>Haftalık GDD</th>
                <th>Kümülatif GDD</th>
              </tr>
            </thead>
            <tbody>
              {veri.parselIklim.map((p) => (
                <tr key={p.parcelId}>
                  <td>{p.ad}</td>
                  <td>{p.ortSicaklik !== null ? `${sayiFormat(p.ortSicaklik)}°C` : "—"}</td>
                  <td>
                    {p.minSicaklik !== null && p.maksSicaklik !== null
                      ? `${sayiFormat(p.minSicaklik)}°C / ${sayiFormat(p.maksSicaklik)}°C`
                      : "—"}
                  </td>
                  <td>{sayiFormat(p.haftalikGdd)}</td>
                  <td>{sayiFormat(p.kumulatifGdd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UygulamaBolumu({
  baslik,
  className,
  satirlar,
  renkFields,
}: {
  baslik: string;
  className: string;
  satirlar: { parcelId: string; parcelAdi: string; kayitlar: FieldRecord[] }[];
  renkFields: string[];
}) {
  return (
    <div className="hr-section">
      <div className={`hr-section-head ${className}`}>{baslik}</div>
      {satirlar.length === 0 ? (
        <p className="hr-bos-not">Bu hafta {baslik.toLocaleLowerCase("tr-TR")} kaydı girilmedi.</p>
      ) : (
        satirlar.map((satir) => {
          // Bu parselin haftalık kayıtlarında GERÇEKTEN dolu olan alanlar —
          // tasarımdaki gibi kayıt tipinin TÜM alanları değil, sadece bu
          // satırlarda değeri girilmiş olanlar kolon olarak gösterilir.
          const doluAlanlar = renkFields.filter((key) =>
            satir.kayitlar.some((k) => k.values[key] !== undefined && k.values[key] !== ""),
          );
          return (
            <div key={satir.parcelId}>
              <span className="hr-parsel-etiket">{satir.parcelAdi}</span>
              <div className="table-scroll">
                <table className="data-table hr-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      {doluAlanlar.map((key) => (
                        <th key={key}>{FIELD_LABELLARI[key] ?? key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {satir.kayitlar.map((kayit) => (
                      <tr key={kayit.id}>
                        <td>{formatKisaTarih(kayit.tarih)}</td>
                        {doluAlanlar.map((key) => (
                          <td key={key}>{kayit.values[key] ?? "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// RecordFieldDef.label karşılıkları — seed/record-types.json'daki alan
// key'leriyle birebir (Gübreleme/Yaprak Gübresi/İlaçlama ortak havuzu).
const FIELD_LABELLARI: Record<string, string> = {
  gubreTuru: "Gübre Türü",
  doz: "Doz",
  birim: "Birim",
  uygulamaSekli: "Uygulama Şekli",
  amac: "Amaç / Hedef",
  urunAdi: "Ürün Adı",
  etkenIcerik: "Etken / İçerik",
  yontem: "Yöntem",
  etkenMadde: "Etken Madde",
  ticariAd: "Ticari Ad",
  hedef: "Hedef",
  uygulamaDetayi: "Uygulama Detayı",
  recete: "Reçete",
};

function SulamaBolumu({ veri }: { veri: ReturnType<typeof haftalikRaporVerisiHazirla> }) {
  return (
    <div className="hr-section">
      <div className="hr-section-head sulama">Sulama</div>
      {veri.sulamaIzgaralari.length === 0 ? (
        <p className="hr-bos-not">Bu hafta sulama kaydı girilmedi.</p>
      ) : (
        veri.sulamaIzgaralari.map((izgara, i) => (
          <div key={izgara.parcelId}>
            <div className="hr-section-head sulama" style={i > 0 ? { marginTop: 10 } : undefined}>
              Sulama Yönetimi — {izgara.parcelAdi}
            </div>
            <div className="sulama-grid">
              {izgara.gunSaatleri.map((g) => (
                <div key={g.tarih} className="gun-baslik">
                  {g.gun}
                </div>
              ))}
              <div className="gun-baslik">Toplam</div>
              {izgara.gunSaatleri.map((g) => (
                <div key={g.tarih} className={`deger ${sulamaYogunlukSinifi(g.saat)}`}>
                  {g.saat > 0 ? `${sayiFormat(g.saat)} sa` : "—"}
                </div>
              ))}
              <div className="toplam">{sayiFormat(izgara.toplamSaat)} sa</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function GozlemBolumu({ veri }: { veri: ReturnType<typeof haftalikRaporVerisiHazirla> }) {
  return (
    <div className="hr-section">
      <div className="hr-section-head gozlem">Parsel Gezisi / Gözlemler</div>
      {veri.gozlemSatirlari.length === 0 ? (
        <p className="hr-bos-not">Bu hafta gözlem/ziyaret notu girilmedi.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table hr-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Parsel</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {veri.gozlemSatirlari.map((g, i) => (
                <tr key={i}>
                  <td>{formatKisaTarih(g.tarih)}</td>
                  <td>{g.parcelAdi}</td>
                  <td>{g.not}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type HaftaOzetiSatiri = ReturnType<typeof haftalikOzetHesapla>[number];

const TREND_SATIRLARI: { key: keyof HaftaOzetiSatiri; label: string; birim: string }[] = [
  { key: "sulamaSaat", label: "Sulama", birim: " sa" },
  { key: "gubreUygulama", label: "Gübreleme", birim: " uygulama" },
  { key: "yaprakGubresi", label: "Yaprak Gübresi", birim: " uygulama" },
  { key: "ilacUygulama", label: "İlaçlama", birim: " uygulama" },
  { key: "sahaTespiti", label: "Saha Tespiti", birim: " görev" },
];

function DegerlendirmeBolumu({ veri, customerAdi }: { veri: ReturnType<typeof haftalikRaporVerisiHazirla>; customerAdi: string }) {
  return (
    <div className="hr-section">
      <div className="hr-section-head degerlendirme">Bu Hafta – Geçen Hafta</div>
      <div className="table-scroll">
        <table className="trend-table hr-table">
          <thead>
            <tr>
              <th>Ölçüt</th>
              <th>Geçen Hafta</th>
              <th>Bu Hafta</th>
              <th>Yön</th>
            </tr>
          </thead>
          <tbody>
            {TREND_SATIRLARI.map(({ key, label, birim }) => {
              const bu = (veri.buHafta[key] as number) ?? 0;
              const gecen = (veri.gecenHafta[key] as number) ?? 0;
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    {gecen}
                    {birim}
                  </td>
                  <td>
                    {bu}
                    {birim}
                  </td>
                  <td className={trendSinifi(bu, gecen)}>{trendOku(bu, gecen)}</td>
                </tr>
              );
            })}
            {(() => {
              const bu = veri.buHafta.haftalikGdd;
              const gecen = veri.gecenHafta.haftalikGdd;
              return (
                <tr>
                  <td>Haftalık GDD</td>
                  <td>{sayiFormat(gecen)}</td>
                  <td>{sayiFormat(bu)}</td>
                  <td className={bu !== null && gecen !== null ? trendSinifi(bu, gecen) : "trend-eq"}>
                    {bu !== null && gecen !== null ? trendOku(bu, gecen) : "—"}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
      <p className="hr-bos-not" style={{ padding: "0 0 4px" }}>
        {customerAdi} için {formatHaftaAraligi(veri.haftaBaslangic, veri.haftaBitis)} haftasının bir önceki haftayla karşılaştırması.
      </p>
    </div>
  );
}
