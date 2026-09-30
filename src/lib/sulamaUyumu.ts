// Sulama Uyumu — planlanan/gerçekleşen sulama gün karşılaştırma hesabı.
//
// parsel-takip (orijinal proje) src/lib/tarim.ts'teki sulamaUyumuHesapla'nın
// BİREBİR portu — sabit/formül/tolerans HİÇBİRİ değiştirilmedi.

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface SulamaGunSonucu {
  tarih: string;
  puan: 0 | 0.8 | 1;
}

export interface SulamaUyumSonucu {
  gunler: SulamaGunSonucu[];
  planlananGunSayisi: number;
  tamGunSayisi: number;
  yakinGunSayisi: number; // ±1 gün toleransıyla eşleşen
  kacirilanGunSayisi: number;
  skor: number | null; // 10 üzerinden
  not: string;
}

// Excel formülü (Yarbaşı_sulama_programı.xlsx, "Sulama Uyumu" sayfası):
//   IF(plan_günü_var, IF(tam_o_gün_sulanmış,1, IF(±1_gün_içinde_sulanmış,0.8,0)), "")
//   puan = ROUND(10 * TOPLAM(gün puanları) / TOPLAM(planlanan gün), 1)
export function sulamaUyumuHesapla(planlananTarihler: string[], uygulananTarihler: string[]): SulamaUyumSonucu {
  const uygulanan = new Set(uygulananTarihler);

  const gunler: SulamaGunSonucu[] = planlananTarihler.map((tarih) => {
    if (uygulanan.has(tarih)) return { tarih, puan: 1 };
    const onceki = addDaysIso(tarih, -1);
    const sonraki = addDaysIso(tarih, 1);
    if (uygulanan.has(onceki) || uygulanan.has(sonraki)) return { tarih, puan: 0.8 };
    return { tarih, puan: 0 };
  });

  const planlananGunSayisi = gunler.length;
  const tamGunSayisi = gunler.filter((g) => g.puan === 1).length;
  const yakinGunSayisi = gunler.filter((g) => g.puan === 0.8).length;
  const kacirilanGunSayisi = gunler.filter((g) => g.puan === 0).length;
  const toplamPuan = gunler.reduce((s, g) => s + g.puan, 0);

  const skor = planlananGunSayisi === 0 ? null : Math.round(((10 * toplamPuan) / planlananGunSayisi) * 10) / 10;

  let not: string;
  if (planlananGunSayisi === 0) not = "Plan yok";
  else if (planlananGunSayisi < 3) not = "Az plan günü — puan temsili değil";
  else if (kacirilanGunSayisi > 0) not = `${kacirilanGunSayisi} gün kaçırılmış`;
  else not = "Tüm planlanan günler uygulanmış";

  return { gunler, planlananGunSayisi, tamGunSayisi, yakinGunSayisi, kacirilanGunSayisi, skor, not };
}
