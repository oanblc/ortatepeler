// Domain modeli — parsel-takip'in kullanıcı şemasıyla aynı tutuluyor ki bu
// klasördeki auth akışı ileride parsel-takip'e taşınırken sürtünmesiz kopyalansın.

export type Role = "admin" | "muhendis";

export interface User {
  id: string;
  ad: string;
  email: string;
  passwordHash: string;
  rol: Role;
  createdAt: string;
}

// Şifre sıfırlama isteği. `tokenHash` — ham token değil, sha256 hash'i
// saklanır (link ele geçse bile depodaki kayıttan token üretilemesin diye).
export interface PasswordReset {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

// Çiftlikte iletişimde olduğumuz kişi — sorumluMuhendisId'den farklı: o
// bizim tarafımızdaki mühendisi, bu ise müşteri tarafındaki kişiyi belirtir.
// Bir müşterinin birden fazla ilgili kişisi olabilir (ör. birden fazla ortak).
export interface IlgiliKisi {
  ad?: string;
  telefon?: string;
  email?: string;
}

// parsel-takip'teki Customer şemasıyla aynı — bu redesign projesinde henüz
// parsel/kayıt modülleri yok, bu yüzden sadece müşteri CRUD'u için gereken
// alanlar var; ileride parsel-takip'e taşınırken şema birebir uyacak.
export interface Customer {
  id: string;
  ad: string;
  adres?: string;
  ilgiliKisiler: IlgiliKisi[];
  sorumluMuhendisId: string;
  createdAt: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ParcelUrun {
  urun: string;
  anac?: string;
}

// topraq.ai (agro.topraq.ai) ile otomatik eşleştirme sonucu — parsel sınırı
// kaydedilince/güncellenince arka planda kurulur (bkz. src/lib/topraq.ts
// parselEslestir). Eşleşme yoksa bu alan tanımsız kalır — sahte veri
// üretmek yerine parsel detayında dürüst bir boş durum gösterilir.
export interface TopraqEslesme {
  customerId: number;
  fieldId: number;
  fieldName: string;
  nemDeviceId?: number;
  istasyonDeviceId?: number;
  eslestirmeTarihi: string; // ISO
}

// Toprak Nemi grafiğinin ihtiyaç duyduğu günlük özet — getTopraqNemProfili'nin
// 2 saatlik "buckets" verisinden günlük ortalamaya indirgenerek türetilir.
export interface ToprakNemGunlukOzet {
  tarih: string; // YYYY-MM-DD
  nem20: number;
  nem40: number;
  nem60: number;
  nem80: number;
  nemAgirlikli: number;
}

// Sıcaklık/Bağıl Nem grafiklerinin ihtiyaç duyduğu günlük özet — hava
// istasyonu ham verisinden (saatlik) günlük min/maks/ortalamaya indirgenir.
export interface HavaGunlukOzet {
  tarih: string; // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  bagilNem: number;
}

// Parsel — bir müşteriye bağlı tek bir tarla/arazi kaydı. Sınır ve alan
// haritadan çizilerek gelir (bkz. src/lib/geo.ts), elle girilmez.
export interface Parcel {
  id: string;
  customerId: string;
  ad: string;
  alanDonum: number;
  sinir?: LatLng[];
  urunler: ParcelUrun[];
  /** Yaprak Gübreleme Planı'ndaki "Block No" — parsel oluşturulurken otomatik üretilir (bkz. blockNoUret). */
  blockNo: string;
  sulamaSekli?: string;
  sulamaDetay?: string;
  kuyuIds?: string[];
  siraArasi?: number;
  siraUzeri?: number;
  agacSayisi?: number;
  /** Isı Toplamı (GDD) hesabında kullanılan taban sıcaklık, °C — varsayılan 10 */
  gddTabanSicaklik?: number;
  /** topraq.ai otomatik eşleştirme sonucu — bkz. src/lib/topraq.ts parselEslestir */
  topraqEslesme?: TopraqEslesme;
  createdAt: string;
}

// Sulama Kuyusu — ayrı bir "Kuyular" modülünün ilk çekirdeği. Şimdilik sadece
// parsel ekleme akışında seçilebilir/hızlı eklenebilir; tam CRUD sayfası yok.
export interface Well {
  id: string;
  customerId: string;
  ad: string;
  createdAt: string;
}

// Görev — müşteri bazlı basit iş takibi (Sulama Kuyuları ile aynı desende:
// tam CRUD, ayrı sekme, Genel Bilgi'de özet kart).
export type GorevDurumu = "bekliyor" | "tamamlandi" | "iptal";

export interface Gorev {
  id: string;
  customerId: string;
  konu: string;
  durum: GorevDurumu;
  not?: string;
  createdAt: string;
}

// Saha Kayıtları (jurnal) — parsel-takip'teki "Kayıtlar" modülünün birebir
// portu. 6 sabit kayıt tipi (seed/record-types.json'dan gelir), her tipin
// kendi dinamik alan seti var (values). RecordTypeDef salt okunur (seed'den
// gelir, kullanıcı yeni tip tanımlayamaz), FieldRecord ise parsel bazlı,
// customerId-scoped repository pattern'ine uyacak şekilde tutulur.
export type FieldType = "text" | "number" | "date" | "select" | "textarea";

export interface RecordFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[]; // type === "select" ise
  required?: boolean;
}

export interface RecordTypeDef {
  id: string;
  ad: string; // "Gübreleme", "Sulama" ...
  ikon: string; // "sprout" | "droplet" | "bug" | "eye" — IconSprite'daki i-<ikon> ile birebir eşleşir
  fields: RecordFieldDef[];
}

export interface FieldRecord {
  id: string;
  customerId: string; // redesign'in customerId-scoped repository pattern'ine uymak için orijinalde YOK, burada eklendi
  parcelId: string;
  recordTypeId: string;
  tarih: string; // YYYY-MM-DD
  muhendisId: string; // requireUser()'dan gelen user.id
  values: Record<string, string | number>;
  not?: string;
  createdAt: string;
  // Ziyaret Kaydı sekmesi için eklendi — dolu ise `tarih` dönem başlangıcı, bu
  // bitişi temsil eder. Ziyaret Kaydı'nda genelde kullanılmaz (tek gün),
  // ileride çok günlük aralık için hazır (parsel-takip'teki Haftalık Rapor'un
  // dönem alanlarının aynısı).
  donemBitis?: string;
  fenolojikDonem?: string;
  durum?: string;
  /** 1-10 arası, opsiyonel — bu ziyarette bu parselin ne kadar acil müdahale gerektirdiği. */
  oncelikPuani?: number;
  /** "/uploads/ziyaret-kaydi/<visitId>/<dosyaadi>" gibi public'ten servis edilen göreli yollar. */
  gorseller?: string[];
  /** Ziyarette tespit edilen hastalık/zararlı adları (Ayarlar > Hastalık / Zararlı listesinden). Ad olarak saklanır: liste sonradan değişse de kayıt okunur kalır. */
  hastaliklar?: string[];
}

// Beslenme (gübreleme) planı — parsel-takip'teki src/lib/beslenme.ts hesap
// motorunun ve bu tipin birebir portu; customerId alanı redesign'in
// customerId-scoped repository pattern'ine uymak için eklendi (orijinalde yok).
export type BeslenmeUrun = "AS21" | "MAP" | "K2SO4" | "H3PO4";

export interface BeslenmePlani {
  id: string;
  customerId: string;
  parcelId: string;
  sezon: string; // "2026" gibi
  hedefAzotKgHa: number; // hedeflenen yıllık saf azot, kg/ha
  hedefN: number; // referans oran (genelde 100)
  hedefP: number; // hedef N:P:K oranındaki P payı
  hedefK: number; // hedef N:P:K oranındaki K payı
  agacSayisiHa: number; // dekar/ha başına ağaç sayısı
  not?: string;
  createdAt: string;
}

// Plana karşılık fiilen sahada verilen gübre miktarı (öneri ile
// karşılaştırma için).
export interface BeslenmeUygulamaKaydi {
  id: string;
  customerId: string;
  parcelId: string;
  planId: string;
  tarih: string; // YYYY-MM-DD
  urun: BeslenmeUrun;
  miktarKg: number;
  not?: string;
  createdAt: string;
}

export type FertigasyonUrun = "AS21" | "K2SO4" | "H3PO4" | "Demir";

export interface FertigasyonKaydi {
  id: string;
  customerId: string;
  parcelId: string;
  tarih: string; // YYYY-MM-DD
  urun: FertigasyonUrun;
  vanaAdi?: string;
  suTonaji?: number; // bilgi amaçlı, hesaba girmez
  agacSayisi: number;
  dozAgac: number; // g/ağaç (AS21, K2SO4, Demir) veya cc/ağaç (H3PO4)
  ambalajBoyutu: number; // çuval/bidon başına kg (veya H3PO4 için litre)
  not?: string;
  createdAt: string;
}

// Sulama Uyumu — planlanan sulama planı; customerId alanı redesign'in
// customerId-scoped repository pattern'ine uymak için eklendi (orijinalde
// yok). "Gerçekleşen" tarafı için ayrı bir tip YOK — o veri, Kayıtlar
// modülündeki (FieldRecord) "Sulama" tipindeki kayıtların tarih alanından
// okunur (bkz. src/lib/sulamaUyumu.ts).
export interface SulamaPlani {
  id: string;
  customerId: string;
  parcelId: string;
  donemBaslangic: string; // YYYY-MM-DD
  donemBitis: string;
  planlananTarihler: string[]; // ISO tarih listesi, sunucuda üretilir
  /** Planlanan günde kaç kez sulama yapılacağı — opsiyonel, bilgi amaçlı; sulamaUyumuHesapla'nın gün bazlı skoruna dahil DEĞİL. */
  gundeKacDefa: number | null;
  /** Planlanan tek sulamanın kaç saat süreceği — opsiyonel, bilgi amaçlı; sulamaUyumuHesapla'nın gün bazlı skoruna dahil DEĞİL. */
  gundeKacSaat: number | null;
  createdAt: string;
}

// Genel Değerlendirme sorusu — Ayarlar'da sadece yönetici tarafından
// yönetilir (ekle/düzenle/sil). recordTypes'tan farklı olarak salt okunur
// DEĞİL, ama customerId/parcelId'ye bağlı da değil: global bir koleksiyon.
export type DegerlendirmeSoruTipi = "puan" | "secmeli" | "metin";

export interface DegerlendirmeSorusu {
  id: string;
  soru: string;
  /** Eski kayıtlarda yok → "puan" (1-5 yıldız) sayılır. */
  tip?: DegerlendirmeSoruTipi;
  /** Sadece tip === "secmeli" için: tek seçimlik seçenekler. */
  secenekler?: string[];
  /** Soruyu alacak parseller. Boş/yok → tüm parseller. */
  parselIds?: string[];
  siraNo: number;
  createdAt: string;
}

// Hastalık/Zararlı tanımı — Ayarlar'da sadece yönetici tarafından yönetilir
// (ekle/sil, güncelleme yok). Kayıtlar'daki "Hastalık / Zararlı" tipinin
// "Etken/Zararlı" alanı artık serbest metin değil, bu listeden seçilir.
export interface HastalikTanimi {
  id: string;
  ad: string;
  createdAt: string;
}

// Yaprak Gübreleme Planı — müşterinin gerçek "Yaprak Gübreleme 25.xlsx"
// dosyasının birebir kopyası (bkz. src/lib/yaprakGubrelemePlani.ts): 1 "Genel"
// grup (sezon boyu sabit) + 14 tarihli dönem, ürün/alt-sütun yapısı sabit
// (kullanıcı yeni ürün tanımlayamaz — RecordTypeDef gibi salt okunur bir
// şablon). Yılda BİR KEZ, parsel bazlı doldurulur; tüm sayısal değerler elle
// girilir, hiçbiri bu proje tarafından hesaplanmaz/varsayılmaz.
// `degerler` anahtarı `${dönemIndex}:${ürünIndex}:${altSütunIndex}` formatında
// — YAPRAK_GUBRELEME_PLANI şablonundaki konumu birebir işaret eder.
export interface YaprakGubrelemePlani {
  id: string;
  customerId: string;
  parcelId: string;
  yil: number;
  degerler: Record<string, number>;
  createdAt: string;
  guncellendiAt: string;
}

// Gelir Gider — müşteri/parsele bağlı OLMAYAN, genel işletme gelir/gider
// takibi. customerId opsiyonel: bir müşteriyle ilişkilendirilebilir ama
// zorunlu değil (customerId-scoped repository pattern'inin BİLİNÇLİ olarak
// dışında — bkz. src/lib/repositories.ts gelirGiderKayitlari).
export type GelirGiderTur = "gelir" | "gider";

export interface GelirGiderKaydi {
  id: string;
  tur: GelirGiderTur;
  tarih: string; // YYYY-MM-DD
  tutar: number; // pozitif sayı, tür zaten yön belirtiyor
  kategori: string;
  aciklama?: string;
  customerId?: string; // opsiyonel — bir müşteriyle ilişkilendirilebilir ama zorunlu değil
  fisler?: string[]; // "/uploads/gelir-gider/<kayitId>/<dosya>" gibi göreli yollar
  muhendisId: string; // requireUser()'dan gelen, kaydı oluşturan kullanıcı
  createdAt: string;
}

// Bir parselin bir yıla ait Genel Değerlendirme cevapları — DegerlendirmeSorusu
// listesindeki her soruya karşılık 1-5 puan + opsiyonel not. Yıl bazlı tekil
// kayıt: aynı yıl için tekrar kaydedilirse üzerine günceller (bkz.
// src/lib/repositories.ts parselDegerlendirmeleri.kaydet).
export interface ParselDegerlendirmesi {
  id: string;
  customerId: string;
  parcelId: string;
  yil: string; // "2026" gibi
  cevaplar: { soruId: string; puan: number; not?: string; secim?: string; metin?: string }[];
  createdAt: string;
}

// Panelde sistem hakkında verilen revize/değişiklik talebi — sağ alttaki "Revize" panelinden
// kaydedilir, /revizeler sayfasında
// sayfa bazlı listelenir. Müşteri/parsele bağlı DEĞİL, genel bir koleksiyon.
export type RevizeDurumu = "acik" | "yapildi" | "iptal";

export interface Revize {
  id: string;
  /** Revizenin ait olduğu sayfanın yolu, örn. "/musteriler/c1/parseller/yeni". */
  sayfaYolu: string;
  /** İnsan okuyabilir sayfa adı, örn. "Yeni Parsel (Parsel ekleme sihirbazı)". */
  sayfaAdi: string;
  aciklama: string;
  durum: RevizeDurumu;
  olusturanId: string;
  olusturanAd: string;
  createdAt: string;
}
