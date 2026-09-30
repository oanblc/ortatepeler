"use client";

import { useEffect, useMemo, useState } from "react";
import type { HavaGunlukOzet } from "@/types";
import { formatKisaTarih, formatUzunTarih } from "@/lib/toprakMock";
import { olcekle, cizgiPath, enYakinIndeks } from "@/lib/chartMath";
import { updateParcelGddTabanAction } from "@/lib/actions";

type Aralik = 14 | 30 | 90;
type Gorunum = "grafik" | "tablo";

const W = 760;
const H = 120;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 8;
const PAD_B = 22;

const RENK = "#0e9488";
const TABAN_MIN = 0;
const TABAN_MAX = 30;

// Günlük GDD = max(0, (tempMax+tempMin)/2 - taban) — orijinal projedeki
// haftalık Excel formülünün (bkz. tarim.ts haftalikGdd) günlük karşılığı.
function gunlukGdd(g: HavaGunlukOzet, taban: number): number {
  return Math.max(0, (g.tempMax + g.tempMin) / 2 - taban);
}

export function IsiToplamiChart({
  customerId,
  parcelId,
  veri,
  baslangicTaban,
}: {
  customerId: string;
  parcelId: string;
  veri: HavaGunlukOzet[];
  baslangicTaban: number;
}) {
  const [aralik, setAralik] = useState<Aralik>(30);
  const [gorunum, setGorunumState] = useState<Gorunum>("grafik");
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [taban, setTaban] = useState(baslangicTaban);
  const [tabanKaydediliyor, setTabanKaydediliyor] = useState(false);

  const storageKey = `toprakGorunum_${parcelId}_isiToplami`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "grafik" || saved === "tablo") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGorunumState(saved);
      }
    } catch {
      // depolama kapalı — sessizce yok say
    }
  }, [storageKey]);

  function setGorunum(v: Gorunum) {
    setGorunumState(v);
    try {
      localStorage.setItem(storageKey, v);
    } catch {
      // gizli sekme / depolama kapalı — sessizce yok say
    }
  }

  async function tabanDegistir(yeni: number) {
    const guvenli = Math.min(TABAN_MAX, Math.max(TABAN_MIN, yeni));
    if (guvenli === taban) return;
    setTaban(guvenli);
    setTabanKaydediliyor(true);
    try {
      await updateParcelGddTabanAction(customerId, parcelId, guvenli);
    } finally {
      setTabanKaydediliyor(false);
    }
  }

  const gosterilenVeri = useMemo(() => veri.slice(-aralik), [veri, aralik]);

  // Kümülatif GDD — seçili aralığın başından itibaren, her gün bir öncekinin
  // üstüne eklenerek hesaplanır (dönem başında sıfırlanır).
  const kumulatif = useMemo(() => {
    const sonuc: number[] = [];
    gosterilenVeri.reduce((toplam, g) => {
      const yeni = toplam + gunlukGdd(g, taban);
      sonuc.push(Math.round(yeni * 10) / 10);
      return yeni;
    }, 0);
    return sonuc;
  }, [gosterilenVeri, taban]);

  const donemToplami = kumulatif.length ? kumulatif[kumulatif.length - 1] : 0;

  const { minY, maxY } = useMemo(() => {
    const max = kumulatif.length ? Math.max(...kumulatif) : 100;
    return { minY: 0, maxY: max > 0 ? max * 1.08 : 10 };
  }, [kumulatif]);

  const xler = gosterilenVeri.map((_, i) => olcekle(i, 0, gosterilenVeri.length - 1, PAD_L, W - PAD_R));

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(svgX);
  }

  const hoverIndex = hoverX != null && xler.length > 0 ? enYakinIndeks(hoverX, xler) : null;
  const hoverGun = hoverIndex != null ? gosterilenVeri[hoverIndex] : null;
  const hoverDeger = hoverIndex != null ? kumulatif[hoverIndex] : null;

  const noktalar = gosterilenVeri.map((g, i) => ({ x: xler[i], y: olcekle(kumulatif[i], minY, maxY, H - PAD_B, PAD_T) }));
  const alanPath =
    noktalar.length > 0
      ? `M${noktalar[0].x.toFixed(2)},${(H - PAD_B).toFixed(2)} ${noktalar
          .map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(" ")} L${noktalar[noktalar.length - 1].x.toFixed(2)},${(H - PAD_B).toFixed(2)} Z`
      : "";

  return (
    <div className="card toprak-card">
      <div className="toprak-head">
        <div>
          <h3>Isı Toplamı</h3>
          <span className="chart-son-guncelleme">Büyüme Derece Günü (GDD)</span>
        </div>
        <div className="toprak-controls">
          <div className="taban-sicaklik">
            <label htmlFor={`taban-${parcelId}`}>Taban Sıcaklık</label>
            <div className="taban-stepper">
              <button
                type="button"
                aria-label="Taban sıcaklığı azalt"
                onClick={() => tabanDegistir(taban - 1)}
                disabled={tabanKaydediliyor || taban <= TABAN_MIN}
              >
                −
              </button>
              <input id={`taban-${parcelId}`} className="num" value={taban} readOnly inputMode="numeric" />
              <button
                type="button"
                aria-label="Taban sıcaklığı artır"
                onClick={() => tabanDegistir(taban + 1)}
                disabled={tabanKaydediliyor || taban >= TABAN_MAX}
              >
                +
              </button>
            </div>
            <span className="taban-unit">°C</span>
          </div>
          <div className="aralik-toggle" role="group" aria-label="Zaman aralığı">
            {([14, 30, 90] as Aralik[]).map((a) => (
              <button key={a} type="button" aria-current={aralik === a} onClick={() => setAralik(a)}>
                {a} gün
              </button>
            ))}
          </div>
          <button type="button" className="btn toprak-gorunum-btn" onClick={() => setGorunum(gorunum === "grafik" ? "tablo" : "grafik")}>
            {gorunum === "grafik" ? "Tabloyu gör" : "Grafiği gör"}
          </button>
        </div>
      </div>

      {gorunum === "grafik" ? (
        <div className="gdd-body">
          <div className="gdd-total">
            <span className="lbl">Dönem Toplamı</span>
            <span className="val">
              {donemToplami.toLocaleString("tr-TR")} <span className="unit">GDD</span>
            </span>
            <span className="period">
              {formatKisaTarih(gosterilenVeri[0]?.tarih ?? "")} – {formatKisaTarih(gosterilenVeri[gosterilenVeri.length - 1]?.tarih ?? "")}, taban {taban}°C
            </span>
          </div>

          <div className="chart-wrap">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="chart-svg"
              onPointerMove={handleMove}
              onPointerLeave={() => setHoverX(null)}
            >
              {[0, 1, 2, 3].map((i) => {
                const y = PAD_T + (i * (H - PAD_T - PAD_B)) / 3;
                const val = maxY - (i * (maxY - minY)) / 3;
                return (
                  <g key={i}>
                    <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} className="chart-gridline" />
                    <text x={PAD_L - 8} y={y + 3} className="chart-axis-label" textAnchor="end">
                      {Math.round(val)}
                    </text>
                  </g>
                );
              })}

              <path d={alanPath} fill={RENK} opacity={0.12} />
              <path d={cizgiPath(noktalar)} fill="none" stroke={RENK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

              {hoverIndex != null && (
                <line x1={xler[hoverIndex]} x2={xler[hoverIndex]} y1={PAD_T} y2={H - PAD_B} className="chart-hover-line" />
              )}
            </svg>

            {hoverGun && hoverIndex != null && hoverDeger != null && (
              <div className="chart-tooltip" style={{ left: `${(xler[hoverIndex] / W) * 100}%` }}>
                <div className="tt-date">{formatUzunTarih(hoverGun.tarih)}</div>
                <div className="tt-row">
                  <span className="tt-dot" style={{ background: RENK }} />
                  <span className="tt-k">Birikimli</span>
                  <span className="tt-v">{hoverDeger.toLocaleString("tr-TR")} GDD</span>
                </div>
              </div>
            )}

            <div className="chart-x-labels">
              <span>{formatKisaTarih(gosterilenVeri[0]?.tarih ?? "")}</span>
              <span>{formatKisaTarih(gosterilenVeri[gosterilenVeri.length - 1]?.tarih ?? "")}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th style={{ textAlign: "right" }}>Günlük GDD</th>
                <th style={{ textAlign: "right" }}>Birikimli</th>
              </tr>
            </thead>
            <tbody>
              {gosterilenVeri.map((g, i) => (
                <tr key={g.tarih}>
                  <td>{formatUzunTarih(g.tarih)}</td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {(Math.round(gunlukGdd(g, taban) * 10) / 10).toLocaleString("tr-TR")}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {kumulatif[i].toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="chart-footnote">
        Günlük GDD, o günün en yüksek/en düşük sıcaklığından hesaplanır ve seçili dönem boyunca toplanır. topraq.ai&apos;den şu an
        yalnızca son {veri.length} günlük veri geliyor.
      </p>
    </div>
  );
}
