"use client";

import { useEffect, useMemo, useState } from "react";
import type { HavaGunlukOzet } from "@/types";
import { formatKisaTarih, formatUzunTarih } from "@/lib/toprakMock";
import { olcekle, cizgiPath, bantPath, enYakinIndeks } from "@/lib/chartMath";

type Aralik = 14 | 30 | 90;
type Gorunum = "grafik" | "tablo";

const W = 760;
const H = 140;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 8;
const PAD_B = 22;

const RENK_MAX = "#c2410c";
const RENK_MIN = "#2563eb";

const DON_ESIGI = 2;
const SICAK_ESIGI = 38;

export function SicaklikChart({ parcelId, veri }: { parcelId: string; veri: HavaGunlukOzet[] }) {
  const [aralik, setAralik] = useState<Aralik>(30);
  const [gorunum, setGorunumState] = useState<Gorunum>("grafik");
  const [hoverX, setHoverX] = useState<number | null>(null);

  const storageKey = `toprakGorunum_${parcelId}_sicaklik`;

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

  const gosterilenVeri = useMemo(() => veri.slice(-aralik), [veri, aralik]);

  const { minY, maxY } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const g of gosterilenVeri) {
      if (g.tempMin < min) min = g.tempMin;
      if (g.tempMax > max) max = g.tempMax;
    }
    if (!isFinite(min) || !isFinite(max)) {
      min = 0;
      max = 40;
    }
    const pad = Math.max(2, (max - min) * 0.15);
    return { minY: min - pad, maxY: max + pad };
  }, [gosterilenVeri]);

  const xler = gosterilenVeri.map((_, i) => olcekle(i, 0, gosterilenVeri.length - 1, PAD_L, W - PAD_R));

  const enDusukTemp = useMemo(
    () => (gosterilenVeri.length ? Math.min(...gosterilenVeri.map((g) => g.tempMin)) : null),
    [gosterilenVeri],
  );
  const enYuksekTemp = useMemo(
    () => (gosterilenVeri.length ? Math.max(...gosterilenVeri.map((g) => g.tempMax)) : null),
    [gosterilenVeri],
  );

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(svgX);
  }

  const hoverIndex = hoverX != null && xler.length > 0 ? enYakinIndeks(hoverX, xler) : null;
  const hoverGun = hoverIndex != null ? gosterilenVeri[hoverIndex] : null;

  const maxNoktalar = gosterilenVeri.map((g, i) => ({ x: xler[i], y: olcekle(g.tempMax, minY, maxY, H - PAD_B, PAD_T) }));
  const minNoktalar = gosterilenVeri.map((g, i) => ({ x: xler[i], y: olcekle(g.tempMin, minY, maxY, H - PAD_B, PAD_T) }));

  return (
    <div className="card toprak-card">
      <div className="toprak-head">
        <div>
          <h3>Sıcaklık</h3>
        </div>
        <div className="toprak-controls">
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

      <div className="toprak-legend">
        <span className="legend-item" data-off={false}>
          <span className="legend-dot" style={{ background: RENK_MAX }} />
          En yüksek
        </span>
        <span className="legend-item" data-off={false}>
          <span className="legend-dot legend-dash" style={{ background: RENK_MIN }} />
          En düşük
        </span>
      </div>

      {(enDusukTemp != null && enDusukTemp <= DON_ESIGI) || (enYuksekTemp != null && enYuksekTemp >= SICAK_ESIGI) ? (
        <div className="toprak-note">
          {enDusukTemp != null && enDusukTemp <= DON_ESIGI && (
            <span>Don riski: seçili dönemde en düşük sıcaklık {enDusukTemp}°C&apos;ye düştü.</span>
          )}
          {enYuksekTemp != null && enYuksekTemp >= SICAK_ESIGI && (
            <span>Sıcak stresi: seçili dönemde en yüksek sıcaklık {enYuksekTemp}°C&apos;ye çıktı.</span>
          )}
        </div>
      ) : null}

      {gorunum === "grafik" ? (
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
                    {Math.round(val)}°
                  </text>
                </g>
              );
            })}

            <path d={bantPath(maxNoktalar, minNoktalar)} className="chart-band-fill" />
            <path d={cizgiPath(maxNoktalar)} fill="none" stroke={RENK_MAX} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={cizgiPath(minNoktalar)}
              fill="none"
              stroke={RENK_MIN}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {hoverIndex != null && (
              <line x1={xler[hoverIndex]} x2={xler[hoverIndex]} y1={PAD_T} y2={H - PAD_B} className="chart-hover-line" />
            )}
          </svg>

          {hoverGun && hoverIndex != null && (
            <div className="chart-tooltip" style={{ left: `${(xler[hoverIndex] / W) * 100}%` }}>
              <div className="tt-date">{formatUzunTarih(hoverGun.tarih)}</div>
              <div className="tt-row">
                <span className="tt-dot" style={{ background: RENK_MAX }} />
                <span className="tt-k">En yüksek</span>
                <span className="tt-v">{hoverGun.tempMax}°C</span>
              </div>
              <div className="tt-row">
                <span className="tt-dot" style={{ background: RENK_MIN }} />
                <span className="tt-k">En düşük</span>
                <span className="tt-v">{hoverGun.tempMin}°C</span>
              </div>
            </div>
          )}

          <div className="chart-x-labels">
            <span>{formatKisaTarih(gosterilenVeri[0]?.tarih ?? "")}</span>
            <span>{formatKisaTarih(gosterilenVeri[gosterilenVeri.length - 1]?.tarih ?? "")}</span>
          </div>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th style={{ textAlign: "right" }}>En yüksek</th>
                <th style={{ textAlign: "right" }}>En düşük</th>
              </tr>
            </thead>
            <tbody>
              {[...gosterilenVeri].reverse().map((g) => (
                <tr key={g.tarih}>
                  <td>{formatUzunTarih(g.tarih)}</td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {g.tempMax}°C
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {g.tempMin}°C
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
