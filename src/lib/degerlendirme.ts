import type { DegerlendirmeSorusu, DegerlendirmeSoruTipi, ParselDegerlendirmesi } from "@/types";

export const SORU_TIPLERI: { id: DegerlendirmeSoruTipi; ad: string; aciklama: string }[] = [
  { id: "secmeli", ad: "Seçmeli", aciklama: "Tanımladığınız seçeneklerden biri seçilir." },
  { id: "metin", ad: "Doldurmalı", aciklama: "Cevap serbest metin olarak yazılır." },
  { id: "puan", ad: "1-5 Puan", aciklama: "1-5 yıldız verilir, isteğe bağlı not eklenir." },
];

export function soruTipi(s: DegerlendirmeSorusu): DegerlendirmeSoruTipi {
  return s.tip ?? "puan";
}

/** parselIds boş/yoksa soru tüm parsellere uygulanır. */
export function soruParselIcinGecerli(s: DegerlendirmeSorusu, parcelId: string): boolean {
  return !s.parselIds || s.parselIds.length === 0 || s.parselIds.includes(parcelId);
}

export function cevapMetni(
  soru: DegerlendirmeSorusu,
  cevap: ParselDegerlendirmesi["cevaplar"][number] | undefined,
): string {
  if (!cevap) return "—";
  switch (soruTipi(soru)) {
    case "secmeli":
      return cevap.secim || "—";
    case "metin":
      return cevap.metin || "—";
    default:
      return cevap.puan ? `${cevap.puan} / 5` : "—";
  }
}
