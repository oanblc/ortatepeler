import type { RecordTypeDef, FieldRecord } from "@/types";

// Kayıt tipi adı → tip-badge CSS sınıfı. seed/record-types.json'daki 6 sabit
// tiple birebir eşleşir; adı bilinmeyen bir tip gelirse (teorik olarak seed
// dışı bir veri) nötr "gözlem" görünümüne düşer.
const TIP_SINIF: Record<string, string> = {
  Gübreleme: "tip-gubreleme",
  Sulama: "tip-sulama",
  "Hastalık / Zararlı": "tip-hastalik-zararli",
  Gözlem: "tip-gozlem",
  "Yaprak Gübresi": "tip-yaprak-gubresi",
  İlaçlama: "tip-ilaclama",
};

export function tipBadgeSinifi(ad: string): string {
  return TIP_SINIF[ad] ?? "tip-gozlem";
}

// Öncelik Puanı (1-10) — Ziyaret Kaydı formundaki seçici ve Günlük Saha
// Kaydı raporundaki rozet aynı 3'lü renk bandını kullanır: 1-4 düşük, 5-7
// orta, 8-10 yüksek (Özekenci Çiftlik Excel'indeki "Öncelik Puanı"
// sütununun serbest 1-10 aralığına birebir karşılık gelir).
export const ONCELIK_PUANLARI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function oncelikSinifi(puan: number): "dusuk" | "orta" | "yuksek" {
  if (puan <= 4) return "dusuk";
  if (puan <= 7) return "orta";
  return "yuksek";
}

// "Özet" kolonu / Saha Kayıtları kartı satırı için — kaydın values'undaki ilk
// 1-2 dolu alanı "Alan: değer" formatında kısaca gösterir. Ziyaret Kaydı
// sekmesinden oluşan saf Gözlem kayıtlarında values boş kalabilir (sadece
// açıklama/fotoğraf girilmiş) — bu durumda record.not'un ilk ~60 karakteri
// fallback olarak gösterilir, aksi halde liste dürüst olmayan bir "—" gösterirdi.
export function kayitOzeti(type: RecordTypeDef | undefined, record: FieldRecord): string {
  if (!type) return "—";
  const parcalar: string[] = [];
  for (const field of type.fields) {
    const deger = record.values[field.key];
    if (deger === undefined || deger === null || deger === "") continue;
    parcalar.push(`${field.label}: ${deger}`);
    if (parcalar.length >= 2) break;
  }
  if (parcalar.length > 0) return parcalar.join(" · ");
  if (record.not) {
    return record.not.length > 60 ? `${record.not.slice(0, 60)}…` : record.not;
  }
  return "—";
}

// tarih alanı YYYY-MM-DD saklanıyor — new Date(iso) ile parse edilirse yerel
// saat dilimi kaymasından bir gün geri/ileri gidebilir, bu yüzden elle parçalanır.
export function formatKayitTarihi(tarih: string): string {
  const [yil, ay, gun] = tarih.split("-").map(Number);
  if (!yil || !ay || !gun) return tarih;
  return new Date(yil, ay - 1, gun).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
