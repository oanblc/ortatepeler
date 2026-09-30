"use client";

import { useEffect, useMemo, useState } from "react";
import type { HavaGunlukOzet } from "@/types";
import { formatKisaTarih, formatUzunTarih } from "@/lib/toprakMock";
import { olcekle, cizgiPath, enYakinIndeks } from "@/lib/chartMath";

type Aralik = 14 | 30 | 90;
type Gorunum = "grafik" | "tablo";

const W = 760;
const H = 120;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 8;
const PAD_B = 22;

const RENK = "#0e9488";

export function BagilNemChart({ parcelId, veri }: { parcelId: string; veri: HavaGunlukOzet[] }) {
  const [aralik, setAralik] = useState<Aralik>(30);
  const [gorunum, setGorunumState] = useState<Gorunum>("grafik");
  const [hoverX, setHoverX] = useState<number | null>(null);

  const storageKey = `toprakGorunum_${parcelId}_bagilNem`;

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
    const degerler = gosterilenVeri.map((g) => g.bagilNem);
    let min = degerler.length ? Math.min(...degerler) : 0;
    let max = degerler.length ? Math.max(...degerler) : 100;
    const pad = Math.max(3, (max - min) * 0.15);
    min = Math.max(0, min - pad);
    max = Math.min(100, max + pad);
    return { minY: min, maxY: max };
  }, [gosterilenVeri]);

  const xler = gosterilenVeri.map((_, i) => olcekle(i, 0, gosterilenVeri.length - 1, PAD_L, W - PAD_R));

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(svgX);
  }

  const hoverIndex = hoverX != null && xler.length > 0 ? enYakinIndeks(hoverX, xler) : null;
  const hoverGun = hoverIndex != null ? gosterilenVeri[hoverIndex] : null;

  const noktalar = gosterilenVeri.map((g, i) => ({ x: xler[i], y: olcekle(g.bagilNem, minY, maxY, H - PAD_B, PAD_T) }));

  return (
    <div className="card toprak-card">
      <div className="toprak-head">
        <div>
          <h3>Bağıl Nem</h3>
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
                    %{Math.round(val)}
                  </text>
                </g>
              );
            })}

            <path d={cizgiPath(noktalar)} fill="none" stroke={RENK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {hoverIndex != null && (
              <line x1={xler[hoverIndex]} x2={xler[hoverIndex]} y1={PAD_T} y2={H - PAD_B} className="chart-hover-line" />
            )}
          </svg>

          {hoverGun && hoverIndex != null && (
            <div className="chart-tooltip" style={{ left: `${(xler[hoverIndex] / W) * 100}%` }}>
              <div className="tt-date">{formatUzunTarih(hoverGun.tarih)}</div>
              <div className="tt-row">
                <span className="tt-dot" style={{ background: RENK }} />
                <span className="tt-k">Bağıl nem</span>
                <span className="tt-v">%{hoverGun.bagilNem}</span>
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
                <th style={{ textAlign: "right" }}>Bağıl nem</th>
              </tr>
            </thead>
            <tbody>
              {[...gosterilenVeri].reverse().map((g) => (
                <tr key={g.tarih}>
                  <td>{formatUzunTarih(g.tarih)}</td>
                  <td className="num" style={{ textAlign: "right" }}>
                    %{g.bagilNem}
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
