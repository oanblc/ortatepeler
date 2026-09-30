// Beslenme (gübreleme) programı hesaplama motoru.
//
// Gerçek mühendis dosyasındaki (naryeri 26.06.2026.xlsx) formül zincirinin
// birebir karşılığı — CALISMA -> öneri 2024 -> data map -> data total parsel
// sayfaları arasındaki hesap tek fonksiyonda toplandı. Sabitler (0.477,
// 0.487, 1.64, 0.12 ve dönem oranları) o dosyadaki formüllerden aynen alındı,
// gerçek hücre değerleriyle (13nwm bloğu, hedef azot=170 kg/ha, ağaç/ha=278)
// doğrulandı.
//
// parsel-takip (orijinal proje) src/lib/beslenme.ts'in BİREBİR portu —
// sabit/oran/formül HİÇBİRİ değiştirilmedi, sadece import tipi bu projenin
// @/types'ından alındı.

import type { BeslenmePlani } from "@/types";

const AS21_N_ORANI = 0.21; // amonyum sülfatın azot oranı
const H3PO4_KATSAYI = 0.477;
const K2SO4_KATSAYI = 0.487;
const MAP_DONUSUM = 1.64; // H3PO4 (cc) -> MAP (g) dönüşüm katsayısı
const MAP_AZOT_DUSUM_ORANI = 0.12; // MAP'in içerdiği azot payı, AS21 dozundan düşülür

export type BeslenmeUrun = "AS21" | "MAP" | "K2SO4" | "H3PO4";

export interface BeslenmeUygulamaSatiri {
  id: string;
  donem: string;
  urun: BeslenmeUrun;
  birim: "g/ağaç" | "cc/ağaç";
  dozAgac: number;
}

export interface BeslenmeSonucu {
  as21ToplamGrAgac: number;
  alanHa: number;
  toplamAgac: number;
  satirlar: BeslenmeUygulamaSatiri[];
  toplamUrunAgac: Record<BeslenmeUrun, number>;
  toplamUrunParsel: Record<BeslenmeUrun, number>; // kg (H3PO4 için litre)
}

export function beslenmePlaniHesapla(plan: BeslenmePlani, alanDonum: number): BeslenmeSonucu {
  const alanHa = alanDonum / 10;
  const toplamAgac = alanHa * plan.agacSayisiHa;

  // Ağaç başına, sezon boyunca verilecek toplam AS21 (gram) — Ha payı
  // sadeleştiği için sadece hedef azot ve ağaç sıklığına bağlı.
  const as21Toplam = (plan.hedefAzotKgHa / AS21_N_ORANI / plan.agacSayisiHa) * 1000;

  // AS21'in sezona yayılışı: %60 / %36 / %4 (Şubat-Mart / Mayıs / Temmuz)
  const as21D1 = as21Toplam * 0.6;
  const as21D2 = as21Toplam * 0.36;
  const as21D3 = as21Toplam - as21D1 - as21D2;

  const pOrani = plan.hedefP / 100;
  const kOrani = plan.hedefK / 100;

  // Fosfor (H3PO4) 3 zamana bölünür: %35 / %32.5 / %32.5. İlk ikisi MAP'e
  // (granül) çevrilirken üçüncüsü (Ağustos Ortası) sıvı H3PO4 olarak kalır.
  const h3po4D1 = as21Toplam * H3PO4_KATSAYI * pOrani * 0.35;
  const h3po4D3 = as21Toplam * H3PO4_KATSAYI * pOrani * 0.325;
  const h3po4AgustosOrtasi = as21Toplam * H3PO4_KATSAYI * pOrani * 0.325;

  const mapD1 = h3po4D1 * MAP_DONUSUM;
  const mapD3 = h3po4D3 * MAP_DONUSUM;

  // MAP azot da içerdiği için o dönemlerin AS21 dozu düşülerek düzeltilir.
  const as21D1Duzeltilmis = as21D1 - mapD1 * MAP_AZOT_DUSUM_ORANI;
  const as21D3Duzeltilmis = as21D3 - mapD3 * MAP_AZOT_DUSUM_ORANI;

  // Potasyum (K2SO4) 4 zamana bölünür: %22 / %41 / %24.5 / %12.5
  const k2so4D1 = as21Toplam * K2SO4_KATSAYI * kOrani * 0.22;
  const k2so4D2 = as21Toplam * K2SO4_KATSAYI * kOrani * 0.41;
  const k2so4D3 = as21Toplam * K2SO4_KATSAYI * kOrani * 0.245;
  const k2so4AgustosSonu = as21Toplam * K2SO4_KATSAYI * kOrani * 0.125;

  const satirlar: BeslenmeUygulamaSatiri[] = [
    { id: "d1-as21", donem: "Şubat Başı – Mart Ortası", urun: "AS21", birim: "g/ağaç", dozAgac: as21D1Duzeltilmis },
    { id: "d1-map", donem: "Şubat Başı – Mart Ortası", urun: "MAP", birim: "g/ağaç", dozAgac: mapD1 },
    { id: "d1-k2so4", donem: "Şubat Başı – Mart Ortası", urun: "K2SO4", birim: "g/ağaç", dozAgac: k2so4D1 },
    { id: "d2-as21", donem: "Mayıs Ortası – Sonu", urun: "AS21", birim: "g/ağaç", dozAgac: as21D2 },
    { id: "d2-k2so4", donem: "Mayıs Ortası – Sonu", urun: "K2SO4", birim: "g/ağaç", dozAgac: k2so4D2 },
    { id: "d3-as21", donem: "Temmuz Başı", urun: "AS21", birim: "g/ağaç", dozAgac: as21D3Duzeltilmis },
    { id: "d3-map", donem: "Temmuz Başı", urun: "MAP", birim: "g/ağaç", dozAgac: mapD3 },
    { id: "d3-k2so4", donem: "Temmuz Başı", urun: "K2SO4", birim: "g/ağaç", dozAgac: k2so4D3 },
    { id: "d4-h3po4", donem: "Ağustos Ortası", urun: "H3PO4", birim: "cc/ağaç", dozAgac: h3po4AgustosOrtasi },
    { id: "d5-k2so4", donem: "Ağustos Sonu", urun: "K2SO4", birim: "g/ağaç", dozAgac: k2so4AgustosSonu },
  ];

  const toplamUrunAgac = {} as Record<BeslenmeUrun, number>;
  for (const s of satirlar) toplamUrunAgac[s.urun] = (toplamUrunAgac[s.urun] ?? 0) + s.dozAgac;

  const toplamUrunParsel = {} as Record<BeslenmeUrun, number>;
  for (const urun of Object.keys(toplamUrunAgac) as BeslenmeUrun[]) {
    toplamUrunParsel[urun] = (toplamUrunAgac[urun] * toplamAgac) / 1000;
  }

  return { as21ToplamGrAgac: as21Toplam, alanHa, toplamAgac, satirlar, toplamUrunAgac, toplamUrunParsel };
}

export const URUN_BIRIM_PARSEL: Record<BeslenmeUrun, string> = {
  AS21: "kg",
  MAP: "kg",
  K2SO4: "kg",
  H3PO4: "litre",
};
