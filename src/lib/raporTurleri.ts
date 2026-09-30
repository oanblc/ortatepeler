// Rapor Oluştur ekranının tek doğruluk kaynağı — sitedeki 10 "rapora konu"
// başlığın hepsi burada tek bir kayıt listesi olarak tanımlanır. Form
// (RaporOlusturView.tsx) hangi kapsam-daraltma kontrolünü (tarih aralığı /
// hafta aralığı / gün aralığı / yıl / dönem-ürün filtresi) göstereceğine ve
// dispatcher (raporVerisiAction.ts) hangi repository'leri okuyup hangi hesap
// fonksiyonunu çağıracağına buradan karar verir.

export type RaporKapsami = "musteri" | "parsel" | "global";

export type KapsamModu =
  | "hafta-araligi" // Haftalık Rapor — aralık N haftaya bölünür, her hafta ayrı antetli sayfa
  | "tarih-araligi" // düz başlangıç/bitiş — Özet, Gelir Gider, Beslenme, Fertigasyon, Ziyaret Kaydı
  | "gun-araligi" // Günlük Saha Kaydı — tek tabloda Tarih sütunu
  | "yil" // Genel Değerlendirme
  | "donem-urun-filtresi" // Yaprak Gübreleme Planı — yıl + mevcut Dönem/Ürün filtreleri
  | "tarih-araligi-parsel"; // Sulama Uyumu — parsel zorunlu, plan pencereleriyle kesişim

export interface RaporTuruTanimi {
  id: string;
  etiket: string;
  aciklama: string;
  ikon: string;
  kapsam: RaporKapsami;
  kapsamModu: KapsamModu;
  /** Parsel seçimi zorunlu mu (Sulama Uyumu/Beslenme/Fertigasyon/Genel Değerlendirme). */
  parselSecimZorunlu: boolean;
  /** Birden fazla parsel seçilebilir mi (Haftalık Rapor/Günlük Saha Kaydı) — false ise tek parsel ya da "tüm parseller" (müşteri kapsamı). */
  parselCokluSecim: boolean;
}

export const RAPOR_TURLERI: RaporTuruTanimi[] = [
  {
    id: "haftalik",
    etiket: "Haftalık Rapor",
    aciklama: "Seçili hafta(lar) + parseller için detaylı saha dökümü",
    ikon: "reports",
    kapsam: "musteri",
    kapsamModu: "hafta-araligi",
    parselSecimZorunlu: false,
    parselCokluSecim: true,
  },
  {
    id: "ozet",
    etiket: "Özet Rapor",
    aciklama: "Çok haftalık trend tablosu ve grafikler",
    ikon: "signal",
    kapsam: "musteri",
    kapsamModu: "tarih-araligi",
    parselSecimZorunlu: false,
    parselCokluSecim: false,
  },
  {
    id: "gunluk-saha",
    etiket: "Günlük Saha Kaydı",
    aciklama: "Seçili gün(ler) için parsel bazlı döküm",
    ikon: "home",
    kapsam: "musteri",
    kapsamModu: "gun-araligi",
    parselSecimZorunlu: false,
    parselCokluSecim: true,
  },
  {
    id: "ygp",
    etiket: "Yaprak Gübreleme Planı",
    aciklama: "Seçili yılın tam plan tablosu, dönem/ürüne göre daraltılabilir",
    ikon: "sprout",
    kapsam: "musteri",
    kapsamModu: "donem-urun-filtresi",
    parselSecimZorunlu: false,
    parselCokluSecim: false,
  },
  {
    id: "sulama-uyumu",
    etiket: "Sulama Uyumu",
    aciklama: "Seçili tarih aralığıyla kesişen sulama planları",
    ikon: "droplet",
    kapsam: "parsel",
    kapsamModu: "tarih-araligi-parsel",
    parselSecimZorunlu: true,
    parselCokluSecim: false,
  },
  {
    id: "gelir-gider",
    etiket: "Gelir Gider",
    aciklama: "Seçili tarih aralığının gelir/gider dökümü",
    ikon: "wallet",
    kapsam: "global",
    kapsamModu: "tarih-araligi",
    parselSecimZorunlu: false,
    parselCokluSecim: false,
  },
  {
    id: "beslenme",
    etiket: "Beslenme (Damlama Gübre)",
    aciklama: "Sezon planı + tarih aralığındaki gerçekleşen uygulamalar",
    ikon: "sprout",
    kapsam: "parsel",
    kapsamModu: "tarih-araligi",
    parselSecimZorunlu: true,
    parselCokluSecim: false,
  },
  {
    id: "fertigasyon",
    etiket: "Fertigasyon",
    aciklama: "Tarih aralığına göre fertigasyon kayıtları dökümü",
    ikon: "flask",
    kapsam: "parsel",
    kapsamModu: "tarih-araligi",
    parselSecimZorunlu: true,
    parselCokluSecim: false,
  },
  {
    id: "ziyaret",
    etiket: "Ziyaret Kaydı",
    aciklama: "Tarih aralığına göre tüm saha kayıtları listesi",
    ikon: "clipboard",
    kapsam: "musteri",
    kapsamModu: "tarih-araligi",
    parselSecimZorunlu: false,
    parselCokluSecim: false,
  },
  {
    id: "degerlendirme",
    etiket: "Genel Değerlendirme",
    aciklama: "Seçili yılın yıldız puanı / not tablosu",
    ikon: "star",
    kapsam: "parsel",
    kapsamModu: "yil",
    parselSecimZorunlu: true,
    parselCokluSecim: false,
  },
];

export function raporTuruBul(id: string): RaporTuruTanimi | undefined {
  return RAPOR_TURLERI.find((t) => t.id === id);
}
