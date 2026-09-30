// Parsel ekleme sihirbazı ve parsel düzenleme formu arasında paylaşılan
// sabitler/hesaplamalar — kod tekrarını önlemek için burada tutulur.

export const SULAMA_SEKILLERI = ["Damla Sulama", "Mikro Yağmurlama", "Yağmurlama", "Salma Sulama", "Diğer"];

/** Sıra arası/üzeri (m) ve alan (dönüm) verilince tahmini ağaç sayısını hesaplar. */
export function hesaplaAgacSayisi(alanDonum: number, siraArasi: number, siraUzeri: number): number | null {
  if (siraArasi > 0 && siraUzeri > 0 && alanDonum > 0) {
    return Math.floor((alanDonum * 1000) / (siraArasi * siraUzeri));
  }
  return null;
}
