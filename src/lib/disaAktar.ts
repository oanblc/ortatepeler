"use client";

// Sitedeki tüm rapor tablolarını (Raporlar sekmesi, Yaprak Gübreleme Planı)
// Excel (.xlsx) ve PDF olarak indirmek için genel amaçlı yardımcılar.
//
// Yaklaşım: iş mantığını (haftalık özet hesapları, filtreler vb.) tekrar
// üretmek yerine, DOM'da zaten render edilmiş <table> elemanını okuyup
// birebir dışa aktarır — bu sayede export her zaman ekranda GÖRÜNENLE (aktif
// filtreler, seçili parseller/dönem dahil) birebir aynı olur, ayrı bir "veri
// hazırlama" kod yolu bakım yükü getirmez.
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// jsPDF'in gömülü standart fontları (Helvetica/Times/Courier) Türkçe'ye özgü
// ş/ğ/ı/İ karakterlerini içermiyor (WinAnsi kodlaması) — bu yüzden Noto
// Sans'ın Türkçe alt kümesi public/fonts altına gömülü, ilk PDF talebinde bir
// kez indirilip jsPDF'e kaydediliyor.
let fontYuklemePromise: Promise<{ normal: string; kalin: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const parcaBoyutu = 0x8000;
  for (let i = 0; i < bytes.length; i += parcaBoyutu) {
    binary += String.fromCharCode(...bytes.subarray(i, i + parcaBoyutu));
  }
  return btoa(binary);
}

function fontlariYukle(): Promise<{ normal: string; kalin: string }> {
  if (!fontYuklemePromise) {
    fontYuklemePromise = Promise.all([
      fetch("/fonts/NotoSans-Regular.ttf").then((r) => r.arrayBuffer()),
      fetch("/fonts/NotoSans-Bold.ttf").then((r) => r.arrayBuffer()),
    ]).then(([normalBuf, kalinBuf]) => ({
      normal: arrayBufferToBase64(normalBuf),
      kalin: arrayBufferToBase64(kalinBuf),
    }));
  }
  return fontYuklemePromise;
}

async function turkceFontluPdfOlustur(orientation: "landscape" | "portrait" = "landscape"): Promise<jsPDF> {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const { normal, kalin } = await fontlariYukle();
  doc.addFileToVFS("NotoSans-Regular.ttf", normal);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", kalin);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.setFont("NotoSans", "normal");
  return doc;
}

interface Hucre {
  metin: string;
  colSpan: number;
  rowSpan: number;
  th: boolean;
}

interface TabloGrid {
  grid: (Hucre | null)[][];
  birlestirmeler: { r1: number; c1: number; r2: number; c2: number }[];
  theadSatirSayisi: number;
}

// HTML tablosunu (colSpan/rowSpan dahil) tam bir ızgaraya açar — Excel'e
// birleştirilmiş hücre (merge) olarak, PDF'e ise autoTable'ın kendi
// colSpan/rowSpan desteğiyle aktarılabilmesi için.
function tabloyuGrideAc(tablo: HTMLTableElement): TabloGrid {
  const satirElemanlari = Array.from(tablo.querySelectorAll("tr"));
  const theadSatirSayisi = tablo.querySelector("thead")?.querySelectorAll("tr").length ?? 0;
  const grid: (Hucre | null)[][] = [];
  const birlestirmeler: { r1: number; c1: number; r2: number; c2: number }[] = [];

  satirElemanlari.forEach((tr, rIndex) => {
    if (!grid[rIndex]) grid[rIndex] = [];
    let cIndex = 0;
    Array.from(tr.querySelectorAll("th,td")).forEach((hucreEl) => {
      while (grid[rIndex][cIndex] !== undefined) cIndex++;
      const el = hucreEl as HTMLTableCellElement;
      const inputEl = el.querySelector("input") as HTMLInputElement | null;
      const metin = inputEl ? inputEl.value || "0" : (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const colSpan = el.colSpan || 1;
      const rowSpan = el.rowSpan || 1;
      for (let dr = 0; dr < rowSpan; dr++) {
        if (!grid[rIndex + dr]) grid[rIndex + dr] = [];
        for (let dc = 0; dc < colSpan; dc++) {
          grid[rIndex + dr][cIndex + dc] = dr === 0 && dc === 0 ? { metin, colSpan, rowSpan, th: el.tagName === "TH" } : null;
        }
      }
      if (colSpan > 1 || rowSpan > 1) {
        birlestirmeler.push({ r1: rIndex, c1: cIndex, r2: rIndex + rowSpan - 1, c2: cIndex + colSpan - 1 });
      }
      cIndex += colSpan;
    });
  });

  return { grid, birlestirmeler, theadSatirSayisi };
}

function sayiMi(metin: string): boolean {
  return metin !== "" && metin !== "—" && /^-?[\d.,]+%?$/.test(metin);
}

function hucreDegeri(metin: string): string | number {
  if (!sayiMi(metin)) return metin;
  const temiz = metin.replace("%", "").replace(/\./g, "").replace(",", ".");
  const sayi = Number(temiz);
  return Number.isFinite(sayi) ? sayi : metin;
}

function blobIndir(veri: BlobPart, dosyaAdi: string, tip: string) {
  const blob = new Blob([veri], { type: tip });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Bir veya birden çok tabloyu (her biri ayrı sayfa/sekme) tek bir .xlsx dosyasına aktarır. */
export async function tablolariExceleAktar(
  tablolar: { baslik: string; eleman: HTMLTableElement }[],
  dosyaAdi: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ortatepeler Zirai Danışmanlık Ltd. Şti.";
  wb.created = new Date();

  for (const { baslik, eleman } of tablolar) {
    const { grid, birlestirmeler, theadSatirSayisi } = tabloyuGrideAc(eleman);
    // Excel sayfa adı 31 karakterle ve bazı özel karakterlerle sınırlı.
    const sayfaAdi = baslik.replace(/[[\]*/\\?:]/g, " ").slice(0, 31) || "Sayfa";
    const ws = wb.addWorksheet(sayfaAdi);

    grid.forEach((satir, rIndex) => {
      satir.forEach((hucre, cIndex) => {
        if (!hucre) return;
        const cell = ws.getCell(rIndex + 1, cIndex + 1);
        cell.value = hucreDegeri(hucre.metin);
        if (hucre.th || rIndex < theadSatirSayisi) {
          cell.font = { bold: true };
        }
        cell.alignment = { vertical: "middle", wrapText: true };
      });
    });
    birlestirmeler.forEach((m) => {
      try {
        ws.mergeCells(m.r1 + 1, m.c1 + 1, m.r2 + 1, m.c2 + 1);
      } catch {
        // Aynı bölgeye ikinci kez merge denemesi (iç içe rowSpan/colSpan
        // durumunda nadiren olabilir) — sessizce atlanır, veri kaybı olmaz.
      }
    });
    ws.columns.forEach((col) => {
      col.width = 16;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  blobIndir(
    buffer,
    `${dosyaAdi}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

// Rapor Oluştur'un kurumsal antetli PDF'i için — public/ortatepeler-logo.png
// (jsPDF addImage SVG kabul etmiyor, o yüzden gerçek şirket logosu doğrudan
// PNG olarak tutuluyor). Font gömme kalıbının (fontlariYukle) aynısı: bir kez
// indirilip base64 olarak önbelleğe alınır.
let logoYuklemePromise: Promise<string> | null = null;
function logoYukle(): Promise<string> {
  if (!logoYuklemePromise) {
    logoYuklemePromise = fetch("/ortatepeler-logo.png")
      .then((r) => r.arrayBuffer())
      .then(arrayBufferToBase64);
  }
  return logoYuklemePromise;
}
// public/ortatepeler-logo.png'nin gerçek en/boy oranı (978×234) — jsPDF
// addImage genişlik/yükseklik mm cinsinden istiyor, oran bozulmasın diye sabit.
const LOGO_ORANI = 978 / 234;

export interface RaporSayfaBolumu {
  baslik: string;
  tablo?: HTMLTableElement;
  /** `tablo` yoksa (bu dönemde veri girilmemiş) önizlemedeki BosNot metni — PDF'te tablo yerine basılır. */
  bosMesaj?: string;
  sabitSutunSayisi?: number;
}

export interface RaporSayfaGirdisi {
  eyebrow: string;
  baslik: string;
  altBaslik: string;
  metaSatirlari: { k: string; v: string }[];
  bolumler: RaporSayfaBolumu[];
}

/**
 * Rapor Oluştur ekranının kurumsal antetli PDF'i — RaporAntetSayfasi.tsx'teki
 * ekran önizlemesinin PDF karşılığı. `didDrawPage` ile HER fiziksel sayfanın
 * üstüne logo/marka/iletişim/altın çizgi, altına şirket adı basılır (metin
 * aranabilir kalır) — `sayfalar` dizisindeki her girdi bir "mantıksal" antetli
 * sayfa (ör. bir hafta), kendi başlık bloğunu bir kez yazar; bölümlerinin
 * tablosu taşarsa autoTable kendi iç sayfalamasını yapar, antet/altbilgi o ek
 * sayfalarda da otomatik tekrarlanır.
 */
async function raporAntetliPdfBelgesiOlustur(sayfalar: RaporSayfaGirdisi[]): Promise<jsPDF> {
  // Dikey (portrait) — okunurluk için yatay yerine; geniş tablolar (ör.
  // Yaprak Gübreleme Planı) autoTable'ın kendi yatay sayfa bölünmesiyle
  // (horizontalPageBreak) ek sayfalara taşar, bu zaten desteklenen bir akış.
  const doc = await turkceFontluPdfOlustur("portrait");
  const [logoBase64] = await Promise.all([logoYukle()]);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ANTET_YUKSEKLIK = 26;

  function antetVeAltbilgiCiz() {
    doc.setFillColor(18, 32, 22);
    doc.rect(0, 0, pageWidth, ANTET_YUKSEKLIK, "F");

    // Logo, antedin koyu zemini üzerine oturan gölgeli beyaz bir kart içinde
    // (onaylanan "Koyu Şerit + Beyaz Logo Kartı" tasarımı).
    const logoYukseklik = 13;
    const logoGenislik = logoYukseklik * LOGO_ORANI;
    const kartDolguX = 4;
    const kartDolguY = 3;
    const kartGenislik = logoGenislik + kartDolguX * 2;
    const kartYukseklik = logoYukseklik + kartDolguY * 2;
    const kartY = (ANTET_YUKSEKLIK - kartYukseklik) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(8, kartY, kartGenislik, kartYukseklik, 1.4, 1.4, "F");
    doc.addImage(logoBase64, "PNG", 8 + kartDolguX, kartY + kartDolguY, logoGenislik, logoYukseklik);
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text("bilgi@ortatepeler.com", pageWidth - 8, 11, { align: "right" });
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(199, 210, 200);
    doc.text("0505 428 65 98", pageWidth - 8, 17.5, { align: "right" });

    doc.setFillColor(201, 154, 63);
    doc.rect(0, ANTET_YUKSEKLIK, pageWidth, 1.2, "F");

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(132, 140, 118);
    doc.text("Ortatepeler Zirai Danışmanlık Ltd. Şti.", pageWidth / 2, pageHeight - 7, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  sayfalar.forEach((sayfa, sayfaIndex) => {
    if (sayfaIndex > 0) doc.addPage();

    let y = ANTET_YUKSEKLIK + 20;
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(19);
    doc.setTextColor(23, 30, 23);
    doc.text(sayfa.baslik, 8, y);

    // Rapor türü etiketi artık başlıkla AYNI satırda, sağa hizalı (çiftlik
    // adıyla dikey hizalanacak şekilde) — önceden başlığın üstünde ayrı bir
    // satırdı.
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(9.5);
    const eyebrowMetni = sayfa.eyebrow.toLocaleUpperCase("tr");
    const eyebrowGenislik = doc.getTextWidth(eyebrowMetni) + 7;
    doc.setFillColor(31, 74, 44);
    doc.roundedRect(pageWidth - 8 - eyebrowGenislik, y - 4.6, eyebrowGenislik, 6.2, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(eyebrowMetni, pageWidth - 8 - eyebrowGenislik + 3.5, y - 0.2);
    doc.setTextColor(0, 0, 0);

    y += 8;
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(11);
    // Koyulaştırıldı (önceki #525a4c okunurluğu zayıftı).
    doc.setTextColor(40, 46, 36);
    doc.text(sayfa.altBaslik, 8, y);
    y += 7;

    if (sayfa.metaSatirlari.length > 0) {
      const metaMetni = sayfa.metaSatirlari.map((m) => `${m.k}: ${m.v}`).join("     ");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 46, 36);
      doc.text(metaMetni, 8, y);
      doc.setTextColor(0, 0, 0);
      y += 9;
    } else {
      y += 2;
    }

    sayfa.bolumler.forEach(({ baslik, tablo, bosMesaj, sabitSutunSayisi }) => {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(18, 32, 22);
      doc.text(baslik.toLocaleUpperCase("tr"), 8, y + 4);
      doc.setDrawColor(18, 32, 22);
      doc.setLineWidth(0.5);
      doc.line(8, y + 6, pageWidth - 8, y + 6);
      doc.setTextColor(0, 0, 0);
      y += 6;

      if (!tablo) {
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(132, 140, 118);
        doc.text(bosMesaj ?? "Veri yok.", 8, y + 6);
        doc.setTextColor(0, 0, 0);
        y += 14;
        return;
      }

      const { grid, theadSatirSayisi } = tabloyuGrideAc(tablo);
      const theadSatirlari = grid.slice(0, theadSatirSayisi);
      const govdeSatirlari = grid.slice(theadSatirSayisi);
      const head = theadSatirlari.map((satir) =>
        satir
          .map((hucre) => (hucre ? { content: hucre.metin, colSpan: hucre.colSpan, rowSpan: hucre.rowSpan } : null))
          .filter((h): h is { content: string; colSpan: number; rowSpan: number } => h !== null),
      );
      const body = govdeSatirlari.map((satir) => satir.filter((h): h is Hucre => h !== null).map((h) => h.metin));

      // sabitSutunSayisi'li tablolar (ör. Yaprak Gübreleme Planı — 100'den fazla
      // ürün/kolon) çok geniş; büyütülmüş okunabilirlik fontuyla dikey sayfada
      // sütun başına neredeyse bir sayfa harcanıp yüzlerce sayfaya çıkıyordu.
      // Bu tür tablolarda kompakt bir font/dolgu kullanılır, diğer (az kolonlu)
      // tablolar büyük/okunaklı fontta kalır.
      const genisTabloMu = !!sabitSutunSayisi;
      autoTable(doc, {
        head,
        body,
        startY: y + 3,
        styles: {
          font: "NotoSans",
          fontSize: genisTabloMu ? 6.5 : 9.5,
          cellPadding: genisTabloMu ? 1.3 : 2.4,
          overflow: "linebreak",
        },
        headStyles: {
          font: "NotoSans",
          fillColor: [255, 255, 255],
          textColor: [138, 147, 137],
          fontStyle: "bold",
          fontSize: genisTabloMu ? 6 : 8.5,
          lineWidth: { top: 0, left: 0, right: 0, bottom: 0.5 },
          lineColor: [28, 42, 30],
        },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: sabitSutunSayisi ? Array.from({ length: sabitSutunSayisi }, (_, i) => i) : undefined,
        margin: { top: ANTET_YUKSEKLIK + 4, bottom: 14, left: 8, right: 8 },
        didDrawPage: antetVeAltbilgiCiz,
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
    });

    // Bölüm hiç yoksa (ör. veri bulunamadı) antet/altbilgi yine de basılsın.
    if (sayfa.bolumler.length === 0) antetVeAltbilgiCiz();
  });

  return doc;
}

export async function raporlariAntetliPdfeAktar(sayfalar: RaporSayfaGirdisi[], dosyaAdi: string) {
  const doc = await raporAntetliPdfBelgesiOlustur(sayfalar);
  doc.save(`${dosyaAdi}.pdf`);
}

/**
 * E-posta ile gönderme akışı için — aynı antetli PDF'i diske indirmek yerine
 * bir Blob olarak üretir (raporlariAntetliPdfeAktar'la birebir aynı çizim
 * kodu, bkz. raporAntetliPdfBelgesiOlustur).
 */
export async function raporAntetliPdfBlobUret(sayfalar: RaporSayfaGirdisi[]): Promise<Blob> {
  const doc = await raporAntetliPdfBelgesiOlustur(sayfalar);
  return doc.output("blob");
}

/**
 * Bir antetli sayfa (RaporAntetSayfasi) elemanının içindeki her `.govde-bolum`u
 * ({başlık, tablo}) toplar. `.govde-bolum` bir `data-sabit-sutun` attribute'u
 * taşıyorsa (Yaprak Gübreleme Planı gibi geniş tablolar) PDF'in yatay sayfa
 * bölünmesinde kaç sütunun tekrarlanacağını belirler.
 */
export function govdeBolumlerindenTopla(konteyner: HTMLElement): RaporSayfaBolumu[] {
  const sonuc: RaporSayfaBolumu[] = [];
  konteyner.querySelectorAll(".govde-bolum").forEach((bolum) => {
    const baslikEl = bolum.querySelector(".govde-bolum-baslik");
    const baslik = baslikEl?.textContent?.trim() || "Tablo";
    const tablo = bolum.querySelector("table");
    if (tablo) {
      const sabitStr = bolum.getAttribute("data-sabit-sutun");
      sonuc.push({ baslik, tablo: tablo as HTMLTableElement, sabitSutunSayisi: sabitStr ? Number(sabitStr) : undefined });
      return;
    }
    // Tablo yok — bu dönemde veri girilmemiş demektir (bkz. BosNot). Önizlemedeki
    // "... kaydı girilmedi" notu PDF'te de görünsün diye bölüm atlanmaz.
    const bosNotEl = bolum.querySelector(".rapor-bos-not");
    if (bosNotEl) sonuc.push({ baslik, bosMesaj: bosNotEl.textContent?.trim() || "Veri yok." });
  });
  return sonuc;
}

/**
 * Rapor Oluştur ekranının canlı önizlemesindeki her bir antetli sayfa
 * (RaporAntetSayfasi) elemanını okuyup `RaporSayfaGirdisi[]`'ye çevirir —
 * eyebrow/başlık/alt başlık/meta satırları DOM'daki `.rapor-eyebrow`/`h2`/
 * `.rapor-alt-baslik`/`.meta-item`'dan, bölümler `govdeBolumlerindenTopla`'dan
 * okunur. Hem Excel'in tablolarını hem PDF antedinin sayfa girdilerini AYNI
 * DOM okumasından üretmek için kullanılır (RaporOlusturView.tsx) — TEK bir
 * konteyner ref'i alır (sayfa sayısı N hafta/gün'e göre dinamik olduğu için
 * her sayfaya ayrı ref tutmak yerine `.rapor-sayfa` elemanları konteyner
 * içinde sorgulanır).
 */
export function raporSayfalariniTopla(konteyner: HTMLElement | null): RaporSayfaGirdisi[] {
  if (!konteyner) return [];
  return Array.from(konteyner.querySelectorAll(".rapor-sayfa")).map((el) => {
    const eyebrow = el.querySelector(".rapor-eyebrow")?.textContent?.trim() || "";
    const baslik = el.querySelector(".rapor-baslik-blok h2")?.textContent?.trim() || "";
    const altBaslik = el.querySelector(".rapor-alt-baslik")?.textContent?.trim() || "";
    const metaSatirlari = Array.from(el.querySelectorAll(".meta-item")).map((m) => ({
      k: m.querySelector(".k")?.textContent?.trim() || "",
      v: m.querySelector(".v")?.textContent?.trim() || "",
    }));
    return { eyebrow, baslik, altBaslik, metaSatirlari, bolumler: govdeBolumlerindenTopla(el as HTMLElement) };
  });
}

/**
 * Bir konteyner içindeki TÜM <table> elemanlarını, en yakın başlığı
 * (.hr-section-head / .hr-parsel-etiket / <caption>) tahmin ederek toplar —
 * Haftalık Rapor gibi çok sayıda dinamik tablo (parsel başına ayrı tablo)
 * üreten görünümlerde her tabloyu tek tek ref'lemek yerine kullanılır.
 */
export function konteynerdenTablolariTopla(konteyner: HTMLElement): { baslik: string; eleman: HTMLTableElement }[] {
  const tablolar = Array.from(konteyner.querySelectorAll("table"));
  return tablolar.map((tablo, i) => {
    const section = tablo.closest(".hr-section") ?? konteyner;
    const baslikEl = section.querySelector(".hr-section-head, caption");
    const parselEtiket = tablo.parentElement?.querySelector(".hr-parsel-etiket")?.textContent?.trim();
    const baslik = [baslikEl?.textContent?.trim(), parselEtiket].filter(Boolean).join(" — ") || `Tablo ${i + 1}`;
    return { baslik, eleman: tablo as HTMLTableElement };
  });
}

/**
 * Bir veya birden çok tabloyu tek bir PDF'e aktarır (her tablo kendi
 * başlığıyla, gerekirse ayrı sayfada). Geniş tablolar (Yaprak Gübreleme
 * Planı gibi 100+ sütun) `horizontalPageBreak` ile dikey şeritler halinde
 * bölünür, ilk sütunlar (No/Block No/...) her şeritte tekrar edilir.
 */
export async function tablolariPdfeAktar(
  tablolar: { baslik: string; eleman: HTMLTableElement; sabitSutunSayisi?: number }[],
  dosyaAdi: string,
  belgeBasligi: string,
) {
  const doc = await turkceFontluPdfOlustur();
  let ilkTablo = true;

  for (const { baslik, eleman, sabitSutunSayisi } of tablolar) {
    if (!ilkTablo) doc.addPage();
    ilkTablo = false;

    const { grid, theadSatirSayisi } = tabloyuGrideAc(eleman);
    const theadSatirlari = grid.slice(0, theadSatirSayisi);
    const gövdeSatirlari = grid.slice(theadSatirSayisi);

    const head = theadSatirlari.map((satir) =>
      satir
        .map((hucre) =>
          hucre ? { content: hucre.metin, colSpan: hucre.colSpan, rowSpan: hucre.rowSpan } : null,
        )
        .filter((h): h is { content: string; colSpan: number; rowSpan: number } => h !== null),
    );
    const body = gövdeSatirlari.map((satir) =>
      satir.filter((h): h is Hucre => h !== null).map((hucre) => hucre.metin),
    );

    doc.setFontSize(11);
    doc.text(tablolar.length > 1 ? `${belgeBasligi} — ${baslik}` : belgeBasligi, 10, 10);

    autoTable(doc, {
      head,
      body,
      startY: 14,
      styles: { font: "NotoSans", fontSize: 6, cellPadding: 1.2, overflow: "linebreak" },
      headStyles: { font: "NotoSans", fillColor: [18, 32, 22], textColor: 255, fontStyle: "bold" },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: sabitSutunSayisi
        ? Array.from({ length: sabitSutunSayisi }, (_, i) => i)
        : undefined,
      margin: { top: 14, left: 8, right: 8 },
    });
  }

  doc.save(`${dosyaAdi}.pdf`);
}
