import type { Parcel, HavaGunlukOzet, FieldRecord, RecordTypeDef, Gorev } from "@/types";

// Raporlar sekmesi — Özet ve Haftalık Rapor görünümlerinin ihtiyaç duyduğu
// TÜM hesaplamalar burada, tek bir server-safe (client component'lerden bağımsız)
// dosyada toplanır. Yeni bir veri modeli YOK: parcels/records/recordTypes/gorevler
// ve topraq.ai'den çekilmiş hava verisinden salt-okunur türetilir.
//
// Pazartesi bazlı hafta gruplama mantığı CustomerDetailTabs.tsx'teki Ziyaret
// Kaydı sekmesinin haftaAraligi/gunEkle'siyle ve orijinal projedeki
// isiGunluk.ts'teki haftaBaslangiciBul'la aynıdır — bilinçli küçük kod tekrarı,
// bu dosya "use client" olmayan bir server/lib dosyası olduğu için oradan
// import edilmiyor.

export function haftaBaslangiciBul(tarih: string): string {
  const gun = new Date(tarih + "T00:00:00Z");
  const haftaGunu = gun.getUTCDay() || 7; // Pazartesi=1 ... Pazar=7
  const pazartesi = new Date(gun);
  pazartesi.setUTCDate(gun.getUTCDate() - (haftaGunu - 1));
  return pazartesi.toISOString().slice(0, 10);
}

export function haftaBitisiBul(haftaBaslangic: string): string {
  const gun = new Date(haftaBaslangic + "T00:00:00Z");
  gun.setUTCDate(gun.getUTCDate() + 6);
  return gun.toISOString().slice(0, 10);
}

function gunEkle(tarih: string, adet: number): string {
  const gun = new Date(tarih + "T00:00:00Z");
  gun.setUTCDate(gun.getUTCDate() + adet);
  return gun.toISOString().slice(0, 10);
}

// IsiToplamiChart.tsx'teki gunlukGdd ile AYNI formül (bağımsız kopya —
// bkz. dosya başındaki not).
function gunlukGdd(g: HavaGunlukOzet, taban: number): number {
  return Math.max(0, (g.tempMax + g.tempMin) / 2 - taban);
}

function ortalama(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function yuvarla(n: number | null, basamak = 1): number | null {
  if (n === null) return null;
  const carpan = 10 ** basamak;
  return Math.round(n * carpan) / carpan;
}

export interface HaftaOzeti {
  haftaBaslangic: string;
  haftaBitis: string;
  ortSicaklik: number | null;
  haftalikGdd: number | null;
  kumulatifGdd: number | null;
  sulamaSaat: number;
  sulamaGunu: number;
  gubreUygulama: number;
  yaprakGubresi: number;
  ilacUygulama: number;
  sahaTespiti: number;
}

// Bir parselin belirli bir hafta aralığındaki günlük hava verisini döner —
// havaVerileri[parcelId] tüm dönemi (90 gün) kapsar, burada o haftaya denk
// gelen günler süzülür.
function haftaHavaGunleri(veri: HavaGunlukOzet[] | null | undefined, baslangic: string, bitis: string): HavaGunlukOzet[] {
  if (!veri) return [];
  return veri.filter((g) => g.tarih >= baslangic && g.tarih <= bitis);
}

export function haftalikOzetHesapla(params: {
  parcels: Parcel[];
  havaVerileri: Record<string, HavaGunlukOzet[] | null>;
  records: FieldRecord[];
  recordTypes: RecordTypeDef[];
  gorevler: Gorev[];
  haftaSayisi?: number;
  bugun?: string;
}): HaftaOzeti[] {
  const { parcels, havaVerileri, records, recordTypes, gorevler, haftaSayisi = 8 } = params;
  const bugun = params.bugun ?? new Date().toISOString().slice(0, 10);

  const sulamaId = recordTypes.find((t) => t.ad === "Sulama")?.id;
  const gubrelemeId = recordTypes.find((t) => t.ad === "Gübreleme")?.id;
  const yaprakGubresiId = recordTypes.find((t) => t.ad === "Yaprak Gübresi")?.id;
  const ilaclamaId = recordTypes.find((t) => t.ad === "İlaçlama")?.id;

  const buHaftaBaslangic = haftaBaslangiciBul(bugun);

  // Eskiden yeniye sıralı hafta başlangıçları — bugünü içeren haftadan
  // haftaSayisi kadar geriye.
  const haftaBaslangiclari: string[] = [];
  for (let i = haftaSayisi - 1; i >= 0; i--) {
    haftaBaslangiclari.push(gunEkle(buHaftaBaslangic, -7 * i));
  }

  let kumulatif = 0;
  let kumulatifVeriGoruldu = false;

  return haftaBaslangiclari.map((baslangic) => {
    const bitis = haftaBitisiBul(baslangic);

    // O haftaya denk gelen tüm parsellerin günlük GDD'lerinin düz ortalaması
    // (her parsel kendi taban sıcaklığıyla) — parsel bazlı toplamlar değil,
    // GÜNLÜK gözlemlerin ortalaması alınır.
    const gunlukGddDegerleri: number[] = [];
    const gunlukSicakliklar: number[] = [];
    for (const parcel of parcels) {
      const taban = parcel.gddTabanSicaklik ?? 10;
      const gunler = haftaHavaGunleri(havaVerileri[parcel.id], baslangic, bitis);
      for (const g of gunler) {
        gunlukGddDegerleri.push(gunlukGdd(g, taban));
        gunlukSicakliklar.push((g.tempMax + g.tempMin) / 2);
      }
    }
    const haftalikGddDegeri = ortalama(gunlukGddDegerleri);
    if (haftalikGddDegeri !== null) {
      kumulatif += haftalikGddDegeri;
      kumulatifVeriGoruldu = true;
    }

    const buHaftaKayitlari = records.filter((r) => r.tarih >= baslangic && r.tarih <= bitis);
    const sulamaKayitlari = buHaftaKayitlari.filter((r) => r.recordTypeId === sulamaId);

    const buHaftaGorevleri = gorevler.filter((g) => {
      const gunu = g.createdAt.slice(0, 10);
      return gunu >= baslangic && gunu <= bitis;
    });

    return {
      haftaBaslangic: baslangic,
      haftaBitis: bitis,
      ortSicaklik: yuvarla(ortalama(gunlukSicakliklar)),
      haftalikGdd: yuvarla(haftalikGddDegeri),
      kumulatifGdd: kumulatifVeriGoruldu ? yuvarla(kumulatif) : null,
      sulamaSaat: sulamaKayitlari.reduce((sum, r) => sum + (Number(r.values.sure) || 0), 0),
      sulamaGunu: new Set(sulamaKayitlari.map((r) => r.tarih)).size,
      gubreUygulama: buHaftaKayitlari.filter((r) => r.recordTypeId === gubrelemeId).length,
      yaprakGubresi: buHaftaKayitlari.filter((r) => r.recordTypeId === yaprakGubresiId).length,
      ilacUygulama: buHaftaKayitlari.filter((r) => r.recordTypeId === ilaclamaId).length,
      sahaTespiti: buHaftaGorevleri.length,
    };
  });
}

const GUN_KISALTMA = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
type GunKisaltma = (typeof GUN_KISALTMA)[number];

export interface HaftalikRaporVerisi {
  haftaBaslangic: string;
  haftaBitis: string;
  parselIklim: {
    parcelId: string;
    ad: string;
    ortSicaklik: number | null;
    minSicaklik: number | null;
    maksSicaklik: number | null;
    haftalikGdd: number | null;
    kumulatifGdd: number | null;
  }[];
  gubreSatirlari: { parcelId: string; parcelAdi: string; kayitlar: FieldRecord[] }[];
  yaprakSatirlari: { parcelId: string; parcelAdi: string; kayitlar: FieldRecord[] }[];
  ilacSatirlari: { parcelId: string; parcelAdi: string; kayitlar: FieldRecord[] }[];
  sulamaIzgaralari: {
    parcelId: string;
    parcelAdi: string;
    gunSaatleri: { gun: GunKisaltma; tarih: string; saat: number }[];
    toplamSaat: number;
  }[];
  gozlemSatirlari: { tarih: string; parcelAdi: string; not: string }[];
  buHafta: HaftaOzeti;
  gecenHafta: HaftaOzeti;
}

export function haftalikRaporVerisiHazirla(params: {
  haftaBaslangic: string;
  parcelIds: string[];
  parcels: Parcel[];
  havaVerileri: Record<string, HavaGunlukOzet[] | null>;
  records: FieldRecord[];
  recordTypes: RecordTypeDef[];
  gorevler: Gorev[];
}): HaftalikRaporVerisi {
  const { haftaBaslangic, parcelIds, parcels, havaVerileri, records, recordTypes, gorevler } = params;
  const haftaBitis = haftaBitisiBul(haftaBaslangic);
  const seciliParcelIdSeti = new Set(parcelIds);
  const seciliParceller = parcels.filter((p) => seciliParcelIdSeti.has(p.id));
  const parcelAdi = (id: string) => parcels.find((p) => p.id === id)?.ad ?? "Bilinmeyen parsel";

  const sulamaTipi = recordTypes.find((t) => t.ad === "Sulama");
  const gubrelemeTipi = recordTypes.find((t) => t.ad === "Gübreleme");
  const yaprakGubresiTipi = recordTypes.find((t) => t.ad === "Yaprak Gübresi");
  const ilaclamaTipi = recordTypes.find((t) => t.ad === "İlaçlama");

  const seciliParselKayitlari = records.filter(
    (r) => seciliParcelIdSeti.has(r.parcelId) && r.tarih >= haftaBaslangic && r.tarih <= haftaBitis,
  );

  // --- İklim / Isı Toplamı ---------------------------------------------
  const parselIklim = seciliParceller.map((parcel) => {
    const taban = parcel.gddTabanSicaklik ?? 10;
    const tumGunler = havaVerileri[parcel.id] ?? null;
    const haftaGunleri = haftaHavaGunleri(tumGunler, haftaBaslangic, haftaBitis);

    let kumulatifGdd: number | null = null;
    if (tumGunler) {
      // Dönemin başından (elimizdeki en eski gün) bu haftanın sonuna kadar
      // koşan toplam — IsiToplamiChart.tsx'teki kümülatif GDD mantığıyla aynı.
      const buHaftaSonunaKadar = tumGunler.filter((g) => g.tarih <= haftaBitis);
      if (buHaftaSonunaKadar.length > 0) {
        kumulatifGdd = yuvarla(buHaftaSonunaKadar.reduce((toplam, g) => toplam + gunlukGdd(g, taban), 0));
      }
    }

    const sicakliklar = haftaGunleri.map((g) => (g.tempMax + g.tempMin) / 2);
    const minSicaklik = haftaGunleri.length ? Math.min(...haftaGunleri.map((g) => g.tempMin)) : null;
    const maksSicaklik = haftaGunleri.length ? Math.max(...haftaGunleri.map((g) => g.tempMax)) : null;

    return {
      parcelId: parcel.id,
      ad: parcel.ad,
      ortSicaklik: yuvarla(ortalama(sicakliklar)),
      minSicaklik: minSicaklik !== null ? yuvarla(minSicaklik) : null,
      maksSicaklik: maksSicaklik !== null ? yuvarla(maksSicaklik) : null,
      haftalikGdd: haftaGunleri.length ? yuvarla(haftaGunleri.reduce((t, g) => t + gunlukGdd(g, taban), 0)) : null,
      kumulatifGdd,
    };
  });

  // --- Gübreleme / Yaprak Gübresi / İlaçlama satırları -------------------
  function satirlarUret(recordTypeId: string | undefined) {
    if (!recordTypeId) return [];
    const sonuc: { parcelId: string; parcelAdi: string; kayitlar: FieldRecord[] }[] = [];
    for (const parcel of seciliParceller) {
      const kayitlar = seciliParselKayitlari.filter((r) => r.parcelId === parcel.id && r.recordTypeId === recordTypeId);
      if (kayitlar.length > 0) sonuc.push({ parcelId: parcel.id, parcelAdi: parcel.ad, kayitlar });
    }
    return sonuc;
  }

  const gubreSatirlari = satirlarUret(gubrelemeTipi?.id);
  const yaprakSatirlari = satirlarUret(yaprakGubresiTipi?.id);
  const ilacSatirlari = satirlarUret(ilaclamaTipi?.id);

  // --- Sulama gün-gün ızgarası --------------------------------------------
  const sulamaIzgaralari = seciliParceller
    .map((parcel) => {
      const kayitlar = seciliParselKayitlari.filter((r) => r.parcelId === parcel.id && r.recordTypeId === sulamaTipi?.id);
      if (kayitlar.length === 0) return null;
      const gunSaatleri: { gun: GunKisaltma; tarih: string; saat: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const tarih = gunEkle(haftaBaslangic, i);
        const saat = kayitlar.filter((r) => r.tarih === tarih).reduce((sum, r) => sum + (Number(r.values.sure) || 0), 0);
        gunSaatleri.push({ gun: GUN_KISALTMA[i], tarih, saat });
      }
      return {
        parcelId: parcel.id,
        parcelAdi: parcel.ad,
        gunSaatleri,
        toplamSaat: gunSaatleri.reduce((sum, g) => sum + g.saat, 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // --- Parsel Gezisi / Gözlemler -------------------------------------------
  // Ziyaret Kaydı sekmesi aynı `not`u birden fazla tip kaydına yazabildiği
  // için (parcelId, tarih, not) kombinasyonu bir kez gösterilir.
  const gorulmusAnahtarlar = new Set<string>();
  const gozlemSatirlari: { tarih: string; parcelAdi: string; not: string }[] = [];
  for (const r of seciliParselKayitlari) {
    if (!r.not || !r.not.trim()) continue;
    const anahtar = `${r.parcelId}::${r.tarih}::${r.not}`;
    if (gorulmusAnahtarlar.has(anahtar)) continue;
    gorulmusAnahtarlar.add(anahtar);
    gozlemSatirlari.push({ tarih: r.tarih, parcelAdi: parcelAdi(r.parcelId), not: r.not });
  }
  gozlemSatirlari.sort((a, b) => a.tarih.localeCompare(b.tarih));

  // --- Bu Hafta ↔ Geçen Hafta -------------------------------------------
  const gecenHaftaBaslangic = gunEkle(haftaBaslangic, -7);
  const buHafta = haftalikOzetHesapla({
    parcels: seciliParceller,
    havaVerileri,
    records,
    recordTypes,
    gorevler,
    haftaSayisi: 1,
    bugun: haftaBaslangic,
  })[0]!;
  const gecenHafta = haftalikOzetHesapla({
    parcels: seciliParceller,
    havaVerileri,
    records,
    recordTypes,
    gorevler,
    haftaSayisi: 1,
    bugun: gecenHaftaBaslangic,
  })[0]!;

  return {
    haftaBaslangic,
    haftaBitis,
    parselIklim,
    gubreSatirlari,
    yaprakSatirlari,
    ilacSatirlari,
    sulamaIzgaralari,
    gozlemSatirlari,
    buHafta,
    gecenHafta,
  };
}
