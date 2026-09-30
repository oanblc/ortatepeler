// Fertigasyon (damlamadan verilen gübre) dozlama hesabı.
//
// Gerçek mühendis dosyasındaki (naryeri 26.06.2026.xlsx) "Nar yeri correct"
// ve "Nar yeri dmr correct" sayfalarının formül karşılığı: her vana/uygulama
// satırı için ağaç başına verilecek doz (g veya cc/ağaç) ile ağaç sayısından
// toplam ihtiyaç, ambalaj boyutundan da kaç çuval/bidon gerektiği hesaplanır.
// (I sütunu: =Doz*AğaçSayısı/1000, J sütunu: =Toplam/AmbalajBoyutu)
//
// parsel-takip (orijinal proje) src/lib/fertigasyon.ts'in BİREBİR portu —
// sabit/formül HİÇBİRİ değiştirilmedi, sadece import tipi bu projenin
// @/types'ından alındı.

import type { FertigasyonKaydi, FertigasyonUrun } from "@/types";

export const FERTIGASYON_BIRIM: Record<FertigasyonUrun, { doz: "g/ağaç" | "cc/ağaç"; ambalaj: "kg" | "litre"; ambalajAdi: "çuval" | "bidon" }> = {
  AS21: { doz: "g/ağaç", ambalaj: "kg", ambalajAdi: "çuval" },
  K2SO4: { doz: "g/ağaç", ambalaj: "kg", ambalajAdi: "çuval" },
  Demir: { doz: "g/ağaç", ambalaj: "kg", ambalajAdi: "çuval" },
  H3PO4: { doz: "cc/ağaç", ambalaj: "litre", ambalajAdi: "bidon" },
};

// Excel'deki sabit ambalaj boyutları — form açılışında varsayılan olarak
// önerilir, kullanıcı isterse değiştirebilir.
export const FERTIGASYON_VARSAYILAN_AMBALAJ: Record<FertigasyonUrun, number> = {
  AS21: 50,
  K2SO4: 25,
  H3PO4: 20,
  Demir: 5,
};

export interface FertigasyonSonucu {
  toplamIhtiyac: number; // kg (H3PO4 için litre)
  ambalajSayisi: number; // çuval/bidon
}

export function fertigasyonHesapla(kayit: Pick<FertigasyonKaydi, "agacSayisi" | "dozAgac" | "ambalajBoyutu">): FertigasyonSonucu {
  const toplamIhtiyac = (kayit.dozAgac * kayit.agacSayisi) / 1000;
  const ambalajSayisi = kayit.ambalajBoyutu > 0 ? toplamIhtiyac / kayit.ambalajBoyutu : 0;
  return { toplamIhtiyac, ambalajSayisi };
}
