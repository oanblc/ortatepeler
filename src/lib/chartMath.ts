// Toprak grafiklerinin (ToprakNemiChart, SicaklikChart, BagilNemChart) ortak
// kullandığı basit SVG çizim yardımcıları — harici bir grafik kütüphanesi
// kullanılmıyor, bu yüzden ölçekleme ve path üretimi elle yapılıyor.

export function olcekle(deger: number, min: number, max: number, cikisMin: number, cikisMax: number) {
  if (max === min) return (cikisMin + cikisMax) / 2;
  const oran = (deger - min) / (max - min);
  return cikisMin + oran * (cikisMax - cikisMin);
}

// Basit düz çizgili (linear) SVG path — eğrisel yumuşatma yok, veri noktaları
// zaten günlük olduğundan düz çizgi okunabilirliği bozmuyor.
export function cizgiPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

// İki seri arasındaki alanı dolduran kapalı path (üst seri soldan sağa, alt
// seri sağdan sola) — Sıcaklık grafiğindeki en düşük/en yüksek bandı için.
export function bantPath(ust: { x: number; y: number }[], alt: { x: number; y: number }[]): string {
  if (ust.length === 0 || alt.length === 0) return "";
  const ustYol = ust.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const altYol = [...alt]
    .reverse()
    .map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  return `${ustYol} ${altYol} Z`;
}

export function enYakinIndeks(xHedef: number, xler: number[]): number {
  let enYakin = 0;
  let enKucukFark = Infinity;
  for (let i = 0; i < xler.length; i++) {
    const fark = Math.abs(xler[i] - xHedef);
    if (fark < enKucukFark) {
      enKucukFark = fark;
      enYakin = i;
    }
  }
  return enYakin;
}
