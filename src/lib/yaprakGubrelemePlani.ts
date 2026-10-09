// Yaprak Gübreleme Planı — müşterinin gerçek "Yaprak Gübreleme 25.xlsx"
// dosyasının (sayfa: " yap. prog.2025") birebir kopyası. Python/openpyxl ile
// dosyanın tam hücre yapısı (135 ham sütun, 3 seviyeli başlık: dönem → ürün →
// alt-sütun) çıkarılıp buraya sabit bir şablon olarak kodlandı — kullanıcı bu
// şablonu değiştiremez, sadece her parsel için altındaki sayıları girer.
//
// Excel'de olduğu gibi bırakılan (düzeltilmeyen) 2 anomali "aynenExcel: true"
// ile işaretli: "copper oxi chloride" (Dönem 1) 2. sütunu ticari ad "kocide"
// yazıyor; "bortechin" (Dönem 1 ve Dönem 5) 1. ve 2. sütunu ikisi de "bortechin"
// yazıyor (hangisinin g/100L hangisinin kg/2t olduğu Excel'de belli değil).

export interface YgpAltSutun {
  etiket: string;
  aynenExcel?: boolean;
}

export interface YgpUrun {
  ad: string;
  renk: string;
  uyari?: string;
  kolonlar: YgpAltSutun[];
}

export interface YgpDonem {
  baslik: string;
  banner: "genel" | "tarihli";
  urunler: YgpUrun[];
}

function k(...etiketler: (string | [string, true])[]): YgpAltSutun[] {
  return etiketler.map((e) => (Array.isArray(e) ? { etiket: e[0], aynenExcel: true } : { etiket: e }));
}

export const YAPRAK_GUBRELEME_PLANI: YgpDonem[] = [
  {
    baslik: "Genel",
    banner: "genel",
    urunler: [
      { ad: "mangan sülfat", renk: "#dba86a", kolonlar: k("g/100L", "kg/2 ton", "depoX") },
      { ad: "magnisal", renk: "#d9a6b3", uyari: "Hiçbir gübreyle karıştırma", kolonlar: k("g/100L", "kg/2 ton su", "depoX") },
      { ad: "MAP", renk: "#a9c6dd", kolonlar: k("g/100L", "kg/2 ton su", "depoX") },
      { ad: "molibden GR", renk: "#c6bce0", kolonlar: k("g/100L", "GR/2 ton", "depoX") },
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2 ton su", "depoX") },
      { ad: "potasyum nitrat", renk: "#8fb7dd", uyari: "Hiçbir gübreyle karıştırma", kolonlar: k("g/100L", "kg/2 ton su", "depoX") },
      { ad: "bakır oksiklorür", renk: "#d98c4f", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "bortechin", renk: "#e3ca7c", kolonlar: k("g/100L", "kg/1,5t", "depoX") },
    ],
  },
  {
    baslik: "Tomurcuklanmadan yedi-on gün önce (Ocak sonu / Şubat başı)",
    banner: "tarihli",
    urunler: [
      { ad: "sprey üre (LB)", renk: "#b6c7de", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "bakır oksiklorür", renk: "#d98c4f", kolonlar: k("g/100L", ["kocide", true], "depoX") },
      { ad: "bortechin", renk: "#e3ca7c", kolonlar: k(["bortechin", true], ["bortechin", true], "depoX") },
    ],
  },
  {
    baslik: "Tomurcuklanma (Şubat ortası)",
    banner: "tarihli",
    urunler: [{ ad: "bortechin", renk: "#e3ca7c", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
  {
    baslik: "Şubat sonu / Mart başı",
    banner: "tarihli",
    urunler: [
      { ad: "MAP", renk: "#a9c6dd", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "mangan sülfat (iz element)", renk: "#c98a5c", kolonlar: k("g/100L", "kg/2t", "depoX") },
    ],
  },
  {
    baslik: "Bahçe ziyaretinden sonra",
    banner: "tarihli",
    urunler: [
      { ad: "sprey üre (LB)", renk: "#b6c7de", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "MAP", renk: "#a9c6dd", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "magnisal", renk: "#d9a6b3", kolonlar: k("g/100L", "kg/2t", "depoX") },
    ],
  },
  {
    baslik: "Taç yaprak dökümünden beş-yedi gün sonra (Nisan ortası)",
    banner: "tarihli",
    urunler: [
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "bortechin", renk: "#e3ca7c", kolonlar: k(["bortechin", true], ["bortechin", true], "depoX") },
      { ad: "mangan sülfat (iz element)", renk: "#c98a5c", kolonlar: k("g/100L", "kg/2t", "depoX") },
    ],
  },
  {
    baslik: "Mayıs ikinci haftası",
    banner: "tarihli",
    urunler: [
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "mangan sülfat (iz element)", renk: "#c98a5c", kolonlar: k("g/100L", "kg/2t", "depoX") },
    ],
  },
  {
    baslik: "Mayıs üçüncü-dördüncü haftası",
    banner: "tarihli",
    urunler: [{ ad: "magnisal", renk: "#d9a6b3", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
  {
    baslik: "Mayıs son haftası",
    banner: "tarihli",
    urunler: [{ ad: "potasyum nitrat veya potasyum sülfat", renk: "#8fb7dd", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
  {
    baslik: "Haziran ikinci haftası",
    banner: "tarihli",
    urunler: [
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "mangan sülfat (iz element)", renk: "#c98a5c", kolonlar: k("g/100L", "kg/2t", "depoX") },
    ],
  },
  {
    baslik: "Haziran üçüncü haftası (iz element spreyinden yedi gün sonra)",
    banner: "tarihli",
    urunler: [{ ad: "magnisal", renk: "#d9a6b3", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
  {
    baslik: "Haziran sonu – Temmuz başı",
    banner: "tarihli",
    urunler: [
      { ad: "magnisal", renk: "#d9a6b3", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "çinko sülfat", renk: "#a3cf95", kolonlar: k("g/100L", "kg/2t", "depoX") },
      { ad: "mangan sülfat (iz element)", renk: "#c98a5c", kolonlar: k("g/100L", "kg/2t", "depoX") },
    ],
  },
  {
    baslik: "Temmuz ortası",
    banner: "tarihli",
    urunler: [{ ad: "potasyum nitrat veya potasyum sülfat", renk: "#8fb7dd", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
  {
    baslik: "Ağustos başı",
    banner: "tarihli",
    urunler: [{ ad: "magnisal", renk: "#d9a6b3", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
  {
    baslik: "Ağustos ortası – sonu",
    banner: "tarihli",
    urunler: [{ ad: "MAP", renk: "#a9c6dd", kolonlar: k("g/100L", "kg/2t", "depoX") }],
  },
];

/** `degerler` map'inin anahtar formatı — şablondaki konumu birebir işaret eder. */
export function ygpAnahtar(donemIndex: number, urunIndex: number, kolonIndex: number): string {
  return `${donemIndex}:${urunIndex}:${kolonIndex}`;
}

/**
 * Block No üretimi — müşteri adının kelime baş harfleri (büyük harf) + o
 * müşterinin parselleri arasında sıradaki 2 haneli numara, örn. "Arıkoğlu
 * Çiftlik" → "AÇ-01", "AÇ-02"... `mevcutBlockNolar` aynı müşterinin diğer
 * parsellerinin blockNo'ları (çakışma/sıra kontrolü için).
 */
export function blockNoUret(musteriAdi: string, mevcutBlockNolar: string[]): string {
  const harfler = musteriAdi
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((kelime) => kelime[0]!.toLocaleUpperCase("tr"))
    .join("");
  const onEk = (harfler || "PR") + "-";

  let maxSira = 0;
  for (const blockNo of mevcutBlockNolar) {
    if (blockNo.startsWith(onEk)) {
      const sira = Number(blockNo.slice(onEk.length));
      if (Number.isFinite(sira) && sira > maxSira) maxSira = sira;
    }
  }
  return `${onEk}${String(maxSira + 1).padStart(2, "0")}`;
}

/** Cultivar/Ha/Trees per ha — parselin mevcut alanlarından otomatik türetilir, elle girilmez. */
export function ygpMetaHesapla(parcel: { urunler: { urun: string; anac?: string }[]; alanDonum: number; agacSayisi?: number }) {
  const cultivar = parcel.urunler.length > 0 ? parcel.urunler.map((u) => (u.anac ? `${u.urun} (${u.anac})` : u.urun)).join(", ") : "—";
  const ha = parcel.alanDonum / 10; // alanDonum "dekar" cinsinden tutulur, 1 ha = 10 dekar
  const treesPerHa = parcel.agacSayisi && ha > 0 ? Math.round(parcel.agacSayisi / ha) : null;
  return { cultivar, ha, treesPerHa };
}
