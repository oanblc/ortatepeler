// Plan/kayıt sayfalarındaki yıl seçici için ortak yardımcılar.

/** ?yil= verilmişse onu, yoksa: bu yılın verisi varsa bu yıl, yoksa verisi olan en yeni yıl, yoksa bu yıl. */
export function varsayilanYil(kayitliYillar: number[], istenen?: string | string[]): number {
  const bugun = new Date().getFullYear();
  const n = Number(Array.isArray(istenen) ? istenen[0] : istenen);
  if (Number.isInteger(n) && n > 1900 && n < 3000) return n;
  if (kayitliYillar.includes(bugun)) return bugun;
  return kayitliYillar.length ? Math.max(...kayitliYillar) : bugun;
}

export function yilSecenekleri(kayitliYillar: number[], secilen: number): number[] {
  const bugun = new Date().getFullYear();
  return Array.from(new Set([bugun, bugun - 1, bugun - 2, secilen, ...kayitliYillar])).sort((a, b) => b - a);
}
