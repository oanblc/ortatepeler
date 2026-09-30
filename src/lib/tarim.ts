// Ziyaret Kaydı sekmesi için — parsel-takip'teki (orijinal proje)
// src/lib/tarim.ts dosyasından birebir taşınan sabitler. Sadece bu iki liste
// kullanılıyor, orijinaldeki sulama uyumu hesap motoru bu redesign'da
// src/lib/sulamaUyumu.ts altında ayrı tutuluyor.

// arıkoğlu çiftlik Haftalık Rapor.xlsx — "çalışma" sayfasının Fenolojik Dönem
// sütununa atanmış gerçek Excel açılır listesi (Veri Doğrulama →
// FenolojikDonemler tablosu). Narenciye fenolojik gelişim evreleri.
export const FENOLOJIK_DONEM_LISTESI = [
  "Kış Dinlenmesi",
  "Uyanma",
  "Tomurcuklanma",
  "%25 Çiçeklenme",
  "%50 Çiçeklenme",
  "%80 Çiçeklenme",
  "Petallerin Dökülmesi",
  "Meyve Tutumu",
  "Hücre Bölünmesi Dönemi",
  "Haziran Dökümü",
  "Hücre Genişlemesi",
  "Renk Dönüşümü",
  "Olgunlaşma",
  "Hasat",
  "Hasat Sonrası",
];

export const ZIYARET_DURUM_SECENEKLERI = [
  { value: "", label: "Seçilmedi" },
  { value: "planlandi", label: "Planlandı" },
  { value: "devam_ediyor", label: "Devam Ediyor" },
  { value: "takip_ediliyor", label: "Takip Ediliyor" },
  { value: "bekliyor", label: "Bekliyor" },
  { value: "kritik", label: "Kritik Risk / Gecikme" },
  { value: "acil", label: "Acil" },
  { value: "toplanti_gerekli", label: "Toplantı Gerekli" },
  { value: "tamamlandi", label: "Tamamlandı" },
];
