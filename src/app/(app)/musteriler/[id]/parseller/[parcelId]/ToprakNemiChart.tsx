"use client";

import { useEffect, useMemo, useState } from "react";
import type { ToprakNemGunlukOzet } from "@/types";
import { formatKisaTarih, formatUzunTarih } from "@/lib/toprakMock";
import { olcekle, cizgiPath, enYakinIndeks } from "@/lib/chartMath";

type Aralik = 14 | 30 | 90;
type Gorunum = "grafik" | "tablo";

const SERILER = [
  { key: "nem20", label: "20 cm", renk: "#8fd0c4" },
  { key: "nem40", label: "40 cm", renk: "#4fae9d" },
  { key: "nem60", label: "60 cm", renk: "#1f8778" },
  { key: "nem80", label: "80 cm", renk: "#0e5f54" },
  { key: "nemAgirlikli", label: "Ağırlıklı Ortalama", renk: "#6d28d9" },
] as const;

const W = 760;
const H = 170;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 8;
const PAD_B = 22;

function formatSonGuncelleme(t: string | null) {
  if (!t) return null;
  // "YYYY-MM-DDTHH:mm" (2 saatlik kova anahtarı) -> "22 Eylül 2026, 16:00"
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ToprakNemiChart({
  parcelId,
  veri,
  sonGuncelleme = null,
}: {
  parcelId: string;
  veri: ToprakNemGunlukOzet[];
  sonGuncelleme?: string | null;
}) {
  const [aralik, setAralik] = useState<Aralik>(30);
  const [gorunum, setGorunumState] = useState<Gorunum>("grafik");
  const [gizli, setGizli] = useState<Set<string>>(new Set());
  const [hoverX, setHoverX] = useState<number | null>(null);

  const storageKey = `toprakGorunum_${parcelId}_nem`;

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
    for (const s of SERILER) {
      if (gizli.has(s.key)) continue;
      for (const g of gosterilenVeri) {
        const v = g[s.key];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (!isFinite(min) || !isFinite(max)) {
      min = 0;
      max = 100;
    }
    const pad = Math.max(2, (max - min) * 0.1);
    return { minY: Math.max(0, min - pad), maxY: max + pad };
  }, [gosterilenVeri, gizli]);

  const xler = gosterilenVeri.map((_, i) => olcekle(i, 0, gosterilenVeri.length - 1, PAD_L, W - PAD_R));

  function toggleSeri(key: string) {
    setGizli((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(svgX);
  }

  const hoverIndex = hoverX != null && xler.length > 0 ? enYakinIndeks(hoverX, xler) : null;
  const hoverGun = hoverIndex != null ? gosterilenVeri[hoverIndex] : null;

  return (
    <div className="card toprak-card">
      <div className="toprak-head">
        <div>
          <h3>Toprak Nemi</h3>
          {formatSonGuncelleme(sonGuncelleme) && (
            <span className="chart-son-guncelleme">Son güncelleme: {formatSonGuncelleme(sonGuncelleme)}</span>
          )}
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
        {SERILER.map((s) => (
          <button
            key={s.key}
            type="button"
            className="legend-item"
            data-off={gizli.has(s.key)}
            onClick={() => toggleSeri(s.key)}
          >
            <span className="legend-dot" style={{ background: s.renk }} />
            {s.label}
          </button>
        ))}
      </div>

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
                    {Math.round(val)}
                  </text>
                </g>
              );
            })}

            {SERILER.filter((s) => !gizli.has(s.key)).map((s) => {
              const points = gosterilenVeri.map((g, i) => ({
                x: xler[i],
                y: olcekle(g[s.key], minY, maxY, H - PAD_B, PAD_T),
              }));
              return (
                <path
                  key={s.key}
                  d={cizgiPath(points)}
                  fill="none"
                  stroke={s.renk}
                  strokeWidth={s.key === "nemAgirlikli" ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {hoverIndex != null && (
              <line x1={xler[hoverIndex]} x2={xler[hoverIndex]} y1={PAD_T} y2={H - PAD_B} className="chart-hover-line" />
            )}
          </svg>

          {hoverGun && hoverIndex != null && (
            <div
              className="chart-tooltip"
              style={{
                left: `${(xler[hoverIndex] / W) * 100}%`,
              }}
            >
              <div className="tt-date">{formatUzunTarih(hoverGun.tarih)}</div>
              {SERILER.filter((s) => !gizli.has(s.key)).map((s) => (
                <div className="tt-row" key={s.key}>
                  <span className="tt-dot" style={{ background: s.renk }} />
                  <span className="tt-k">{s.label}</span>
                  <span className="tt-v">%{hoverGun[s.key]}</span>
                </div>
              ))}
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
                {SERILER.map((s) => (
                  <th key={s.key} style={{ textAlign: "right" }}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...gosterilenVeri].reverse().map((g) => (
                <tr key={g.tarih}>
                  <td>{formatUzunTarih(g.tarih)}</td>
                  {SERILER.map((s) => (
                    <td key={s.key} className="num" style={{ textAlign: "right" }}>
                      %{g[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {veri.length < aralik && (
        <p className="chart-footnote">topraq.ai&apos;den şu an için yalnızca son {veri.length} günlük veri geliyor.</p>
      )}
    </div>
  );
}
