import ExcelJS from "exceljs";
import { formatTelefon } from "./format";
import type { IlgiliKisi } from "@/types";

// Müşteri + parsel Excel içe aktarma — şablon üretimi ve dosya okuma. Sütun
// düzeni (şablon ve okuyucu aynı sabitleri kullanır, birlikte değişmeli):
// "Müşteriler": A Müşteri adı*, B Adres, C-E İlgili kişi 1 (ad, telefon, e-posta),
//   F-H İlgili kişi 2, I-K İlgili kişi 3.
// "Parseller": A Müşteri adı*, B Parsel adı*, C Alan (dönüm), D-I Ürün/Anaç x3,
//   J Sulama şekli, K Sıra arası, L Sıra üzeri, M Ağaç sayısı.
export const VERI_SAYFASI = "Müşteriler";
export const PARSEL_SAYFASI = "Parseller";
export const SULAMA_SEKILLERI_EXCEL = ["Damla Sulama", "Mikro Yağmurlama", "Yağmurlama", "Salma Sulama", "Diğer"];
const URUN_SAYISI = 3;
export const MAKS_SATIR = 2000;
const KISI_SAYISI = 3;

export type SatirDurumu = "eklenecek" | "atlanacak" | "hatali";

export type ExcelSatiri = {
  satir: number; // Excel'deki satır numarası
  ad: string;
  adres?: string;
  ilgiliKisiler: IlgiliKisi[];
  durum: SatirDurumu;
  mesaj?: string;
};

export type ParselSatiri = {
  satir: number;
  musteriAdi: string;
  ad: string;
  alanDonum: number;
  urunler: { urun: string; anac?: string }[];
  sulamaSekli?: string;
  siraArasi?: number;
  siraUzeri?: number;
  agacSayisi?: number;
  durum: SatirDurumu;
  mesaj?: string;
};

// Okuyucunun ham çıktısı — durum (eklenecek/atlanacak/hatalı) veritabanıyla karşılaştırılarak
// musteriImportActions.ts'de verilir.
export type HamMusteri = Omit<ExcelSatiri, "durum" | "mesaj"> & { hata?: string };
export type HamParsel = Omit<ParselSatiri, "durum" | "mesaj"> & { hata?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sablonUret(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ortatepeler Zirai Danışmanlık";

  const ws = wb.addWorksheet(VERI_SAYFASI, { views: [{ state: "frozen", ySplit: 1 }] });
  const basliklar = ["Müşteri / İşletme Adı *", "Adres"];
  for (let i = 1; i <= KISI_SAYISI; i++) basliklar.push(`İlgili Kişi ${i} - Ad Soyad`, `İlgili Kişi ${i} - Telefon`, `İlgili Kişi ${i} - E-posta`);
  ws.addRow(basliklar);
  ws.columns = [
    { width: 32 },
    { width: 34 },
    ...Array.from({ length: KISI_SAYISI }, () => [{ width: 24 }, { width: 18 }, { width: 28 }]).flat(),
  ];
  const baslik = ws.getRow(1);
  baslik.height = 30;
  baslik.eachCell((c, col) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col === 1 ? "FF0B7D73" : "FF122016" } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  // Telefon sütunları metin biçimli: baştaki 0 silinmesin.
  for (let k = 0; k < KISI_SAYISI; k++) ws.getColumn(4 + k * 3).numFmt = "@";

  const wp = wb.addWorksheet(PARSEL_SAYFASI, { views: [{ state: "frozen", ySplit: 1 }] });
  const pBasliklar = ["Müşteri / İşletme Adı *", "Parsel Adı *", "Alan (dönüm)"];
  for (let i = 1; i <= URUN_SAYISI; i++) pBasliklar.push(`Ürün ${i}`, `Anaç ${i}`);
  pBasliklar.push("Sulama Şekli", "Sıra Arası (m)", "Sıra Üzeri (m)", "Ağaç Sayısı");
  wp.addRow(pBasliklar);
  wp.columns = [
    { width: 32 }, { width: 26 }, { width: 14 },
    ...Array.from({ length: URUN_SAYISI }, () => [{ width: 20 }, { width: 18 }]).flat(),
    { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const pBaslik = wp.getRow(1);
  pBaslik.height = 30;
  pBaslik.eachCell((c, col) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col <= 2 ? "FF0B7D73" : "FF122016" } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  // Açılır listeler: müşteri adı "Müşteriler" sayfasından (listede olmayan, sistemde kayıtlı müşteri de
  // yazılabilir — uyarı verir ama engellemez), sulama şekli sabit liste.
  // Tek aralık olarak eklenir: hücre hücre atamak dosyada üst üste binen aralıklar üretiyor
  // ve Excel "dosya onarılsın mı?" uyarısı veriyor.
  const sonSatirAdi = MAKS_SATIR + 1;
  // exceljs'in tip tanımında yok ama çalışma zamanında var (bkz. DataValidations.add).
  const dogrulamalar = (wp as unknown as { dataValidations: { add: (aralik: string, v: ExcelJS.DataValidation) => void } }).dataValidations;
  dogrulamalar.add(`A2:A${sonSatirAdi}`, {
    type: "list",
    allowBlank: true,
    formulae: [`'${VERI_SAYFASI}'!$A$2:$A$${sonSatirAdi}`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Müşteri bulunamadı",
    error: "Bu ad Müşteriler sayfasında yok. Sistemde kayıtlı bir müşteriyse devam edebilirsiniz.",
  });
  dogrulamalar.add(`J2:J${sonSatirAdi}`, {
    type: "list",
    allowBlank: true,
    formulae: [`"${SULAMA_SEKILLERI_EXCEL.join(",")}"`],
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Geçersiz sulama şekli",
    error: `Şunlardan biri olmalı: ${SULAMA_SEKILLERI_EXCEL.join(", ")}`,
  });

  const aciklama = wb.addWorksheet("Açıklama");
  aciklama.columns = [{ width: 30 }, { width: 70 }];
  aciklama.addRow(["Müşteri içe aktarma şablonu"]).font = { bold: true, size: 14 };
  aciklama.addRow([]);
  const maddeler: [string, string][] = [
    ["Nasıl doldurulur?", `"${VERI_SAYFASI}" ve "${PARSEL_SAYFASI}" sayfalarının 1. satırı başlıktır, değiştirmeyin. Verileri 2. satırdan itibaren her satıra bir kayıt olacak şekilde yazın. Sadece müşteri ya da sadece parsel doldurabilirsiniz.`],
    ["Zorunlu alan", "Sadece Müşteri / İşletme Adı zorunludur. Diğer alanlar boş bırakılabilir."],
    ["İlgili kişiler", "Bir müşteri için en fazla 3 ilgili kişi girilebilir. Kişi bilgisi yoksa o sütunları boş bırakın."],
    ["Telefon", "Herhangi bir biçimde yazabilirsiniz (0532 123 45 67, 05321234567…); içe aktarırken otomatik düzenlenir."],
    ["Aynı isimli müşteri", "Sistemde zaten kayıtlı olan ya da dosyada tekrar eden müşteri adları atlanır, üzerine yazılmaz."],
    ["Parseller sayfası", `Her satıra bir parsel yazın. "Müşteri Adı" aynı dosyadaki Müşteriler sayfasından ya da sistemde zaten kayıtlı bir müşteriden olmalı (adı birebir aynı yazın). Parsel adı zorunlu; alan, ürün/anaç (en fazla 3), sulama şekli, sıra arası/üzeri ve ağaç sayısı isteğe bağlı.`],
    ["Ağaç sayısı", "Boş bırakırsanız alan, sıra arası ve sıra üzeri doluysa otomatik hesaplanır. Sayılarda virgül (1,5) ya da nokta (1.5) kullanabilirsiniz."],
    ["Parsel sınırı", "Harita sınırı Excel'den girilemez; parseller sınırsız eklenir, sınırı sonra parsel sayfasından çizebilirsiniz (alan Excel'deki değerdir)."],
    ["Aynı isimli parsel", "Aynı müşteride zaten bulunan ya da dosyada tekrar eden parsel adları atlanır."],
    ["İçe aktarma", "Müşteriler > Excel ile İçe Aktar sayfasından dosyayı yükleyin. Önce önizleme gösterilir, onaylayınca kayıt yapılır."],
  ];
  for (const [a, b] of maddeler) {
    const r = aciklama.addRow([a, b]);
    r.getCell(1).font = { bold: true };
    r.alignment = { vertical: "top", wrapText: true };
  }
  aciklama.addRow([]);
  aciklama.addRow(["Örnek satır (içe aktarılmaz)"]).font = { bold: true };
  const ornek = aciklama.addRow(["Arıkoğlu Çiftlik", "Sarıçam, Adana"]);
  ornek.font = { italic: true, color: { argb: "FF6B7280" } };
  aciklama.addRow(["İlgili Kişi 1", "Ahmet Arıkoğlu · 0532 123 45 67 · ahmet@ornek.com"]).font = { italic: true, color: { argb: "FF6B7280" } };
  aciklama.addRow(["Parsel örneği", "Arıkoğlu Çiftlik · Kuzey Parseli · 45 dönüm · Nar / Hicaz · Damla Sulama · 5 m × 3 m"]).font = { italic: true, color: { argb: "FF6B7280" } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function hucreMetni(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((p) => p.text).join("").trim();
    if ("text" in v && v.text != null) return hucreMetni(v.text as ExcelJS.CellValue);
    if ("result" in v && v.result != null) return hucreMetni(v.result as ExcelJS.CellValue);
  }
  return "";
}

function telefonDuzenle(ham: string): string | undefined {
  let rakam = ham.replace(/\D/g, "");
  // Excel sayı olarak okuduysa baştaki 0 gitmiş olabilir (532 123 45 67 → 5321234567).
  if (rakam.length === 10 && !rakam.startsWith("0")) rakam = "0" + rakam;
  return formatTelefon(rakam) || undefined;
}

function sayiOku(ham: string): number | null {
  if (!ham) return null;
  const n = Number(ham.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Dosyayı okur; veritabanıyla karşılaştırma yapmaz (bkz. musteriImportActions.ts). */
export async function dosyaOku(buffer: Buffer): Promise<{ musteriler: HamMusteri[]; parseller: HamParsel[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const wm = wb.getWorksheet(VERI_SAYFASI);
  const wp = wb.getWorksheet(PARSEL_SAYFASI);
  const ilk = wm ?? (wp ? undefined : wb.worksheets[0]);
  if (!wm && !wp && !ilk) throw new Error("Dosyada sayfa bulunamadı.");

  const baslikKontrol = (ws: ExcelJS.Worksheet) => hucreMetni(ws.getRow(1).getCell(1).value).toLocaleLowerCase("tr").includes("müşteri");
  for (const ws of [wm ?? ilk, wp]) {
    if (ws && !baslikKontrol(ws)) {
      throw new Error("Bu dosya şablona uymuyor. Lütfen \"Şablonu İndir\" ile aldığınız dosyayı kullanın.");
    }
  }

  const musteriler: HamMusteri[] = [];
  const mws = wm ?? ilk;
  if (mws) {
    const sonSatir = Math.min(mws.rowCount, MAKS_SATIR + 1);
    for (let i = 2; i <= sonSatir; i++) {
      const row = mws.getRow(i);
      const hucre = (n: number) => hucreMetni(row.getCell(n).value);
      const ad = hucre(1);
      const adres = hucre(2) || undefined;

      const ilgiliKisiler: IlgiliKisi[] = [];
      let hata: string | undefined;
      for (let k = 0; k < KISI_SAYISI; k++) {
        const kad = hucre(3 + k * 3);
        const tel = hucre(4 + k * 3);
        const mail = hucre(5 + k * 3);
        if (!kad && !tel && !mail) continue;
        if (mail && !EMAIL_RE.test(mail)) hata = `İlgili kişi ${k + 1} e-postası geçersiz: ${mail}`;
        ilgiliKisiler.push({ ad: kad || undefined, telefon: tel ? telefonDuzenle(tel) : undefined, email: mail || undefined });
      }
      if (!ad && !adres && ilgiliKisiler.length === 0) continue; // tamamen boş satır
      if (!ad) hata = "Müşteri adı boş.";
      musteriler.push({ satir: i, ad, adres, ilgiliKisiler, hata });
    }
  }

  const parseller: HamParsel[] = [];
  if (wp) {
    const sonSatir = Math.min(wp.rowCount, MAKS_SATIR + 1);
    for (let i = 2; i <= sonSatir; i++) {
      const row = wp.getRow(i);
      const hucre = (n: number) => hucreMetni(row.getCell(n).value);
      const musteriAdi = hucre(1);
      const ad = hucre(2);

      const urunler: { urun: string; anac?: string }[] = [];
      for (let u = 0; u < URUN_SAYISI; u++) {
        const urun = hucre(4 + u * 2);
        const anac = hucre(5 + u * 2);
        if (urun) urunler.push({ urun, anac: anac || undefined });
        else if (anac) urunler.push({ urun: "", anac }); // ürünsüz anaç → hata olarak yakalanır
      }
      const alanHam = hucre(3);
      const sulamaHam = hucre(10);
      const siraArasiHam = hucre(11);
      const siraUzeriHam = hucre(12);
      const agacHam = hucre(13);
      const tumHucreler = [musteriAdi, ad, alanHam, ...urunler.map((x) => x.urun || x.anac), sulamaHam, siraArasiHam, siraUzeriHam, agacHam];
      if (tumHucreler.every((x) => !x)) continue;

      const alan = sayiOku(alanHam);
      const siraArasi = sayiOku(siraArasiHam);
      const siraUzeri = sayiOku(siraUzeriHam);
      const agac = sayiOku(agacHam);
      let hata: string | undefined;
      if (!musteriAdi) hata = "Müşteri adı boş.";
      else if (!ad) hata = "Parsel adı boş.";
      else if (alan !== null && (Number.isNaN(alan) || alan < 0)) hata = `Alan geçersiz: ${alanHam}`;
      else if (urunler.some((x) => !x.urun)) hata = "Anaç girilmiş ama ürün boş.";
      else if ([siraArasi, siraUzeri, agac].some((x) => x !== null && (Number.isNaN(x) || (x as number) < 0))) {
        hata = "Sıra arası, sıra üzeri ve ağaç sayısı sayı olmalı.";
      }
      let sulamaSekli: string | undefined;
      if (!hata && sulamaHam) {
        sulamaSekli = SULAMA_SEKILLERI_EXCEL.find((x) => x.toLocaleLowerCase("tr") === sulamaHam.toLocaleLowerCase("tr"));
        if (!sulamaSekli) hata = `Sulama şekli geçersiz: ${sulamaHam} (${SULAMA_SEKILLERI_EXCEL.join(", ")})`;
      }

      parseller.push({
        satir: i,
        musteriAdi,
        ad,
        alanDonum: alan !== null && !Number.isNaN(alan) ? alan : 0,
        urunler: urunler.filter((x) => x.urun),
        sulamaSekli,
        siraArasi: siraArasi ?? undefined,
        siraUzeri: siraUzeri ?? undefined,
        agacSayisi: agac ?? undefined,
        hata,
      });
    }
  }
  return { musteriler, parseller };
}
