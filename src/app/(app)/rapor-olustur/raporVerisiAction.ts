"use server";

// Rapor Oluştur ekranının TEK dispatcher server action'ı — 10 rapor türü için
// ayrı ayrı action YOK, hepsi buradan `raporTuruId`'ye göre yönlendirilir.
// Her dal SADECE o türün ihtiyacı olan repository'leri okur ve mevcut saf
// hesap fonksiyonlarını (haftalikRaporVerisiHazirla, haftalikOzetHesapla,
// sulamaUyumuHesapla, fertigasyonHesapla, beslenmePlaniHesapla, ygpMetaHesapla)
// ÇAĞIRIR — hiçbiri burada yeniden yazılmaz. sulamaUyumuHesapla'nın kendisi
// HİÇ değiştirilmez, sadece çıktısı (sonuc.gunler) tarih aralığına göre süzülür.

import { soruParselIcinGecerli } from "@/lib/degerlendirme";
import {
  customers,
  parcels as parcelsRepo,
  records as recordsRepo,
  recordTypes as recordTypesRepo,
  gorevler as gorevlerRepo,
  sulamaPlanlari,
  beslenmePlanlari,
  beslenmeUygulamalari,
  fertigasyonKayitlari,
  gelirGiderKayitlari,
  degerlendirmeSorulari,
  parselDegerlendirmeleri,
  yaprakGubrelemePlanlari,
} from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { istasyonGunlukOzet } from "@/lib/topraq";
import {
  haftaBaslangiciBul,
  haftaBitisiBul,
  haftalikOzetHesapla,
  haftalikRaporVerisiHazirla,
  type HaftaOzeti,
  type HaftalikRaporVerisi,
} from "@/lib/haftalikRapor";
import { sulamaUyumuHesapla, type SulamaGunSonucu } from "@/lib/sulamaUyumu";
import { fertigasyonHesapla, type FertigasyonSonucu } from "@/lib/fertigasyon";
import { beslenmePlaniHesapla, type BeslenmeSonucu } from "@/lib/beslenme";
import type {
  Customer,
  Parcel,
  FieldRecord,
  RecordTypeDef,
  HavaGunlukOzet,
  SulamaPlani,
  BeslenmePlani,
  BeslenmeUygulamaKaydi,
  FertigasyonKaydi,
  GelirGiderKaydi,
  DegerlendirmeSorusu,
  ParselDegerlendirmesi,
} from "@/types";

export interface RaporVerisiParams {
  raporTuruId: string;
  musteriId?: string;
  parselIds?: string[];
  baslangic?: string; // YYYY-MM-DD
  bitis?: string; // YYYY-MM-DD
  yil?: number;
}

interface GunlukSatir {
  tarih: string;
  no: number;
  parcelAdi: string;
  durum: string;
  gozlem: string;
  recete: string;
  donem: string;
  oncelikPuani: number | null;
}

export type RaporGorunumVerisi =
  | { tur: "haftalik"; customerAdi: string; haftalar: { haftaBaslangic: string; haftaBitis: string; veri: HaftalikRaporVerisi }[] }
  | { tur: "ozet"; customerAdi: string; haftalar: HaftaOzeti[] }
  | { tur: "gunluk-saha"; customerAdi: string; toplamParselSayisi: number; satirlar: GunlukSatir[] }
  | { tur: "ygp"; customerAdi: string; yil: number; parcels: Parcel[]; degerlerByParcel: Record<string, Record<string, number>> }
  | { tur: "sulama-uyumu"; musteriAdi: string; parcel: Parcel; planGorunumleri: { plan: SulamaPlani; gunler: SulamaGunSonucu[] }[] }
  | { tur: "gelir-gider"; kayitlar: GelirGiderKaydi[]; musteriMap: Record<string, string> }
  | {
      tur: "beslenme";
      musteriAdi: string;
      parcel: Parcel;
      planGorunumleri: { plan: BeslenmePlani; sonuc: BeslenmeSonucu }[];
      uygulamalar: BeslenmeUygulamaKaydi[];
    }
  | { tur: "fertigasyon"; musteriAdi: string; parcel: Parcel; kayitGorunumleri: { kayit: FertigasyonKaydi; sonuc: FertigasyonSonucu }[] }
  | { tur: "ziyaret"; customerAdi: string; kayitlar: FieldRecord[]; parcelAdMap: Record<string, string>; recordTypeMap: Record<string, RecordTypeDef> }
  | { tur: "degerlendirme"; musteriAdi: string; parcel: Parcel; yil: string; sorular: DegerlendirmeSorusu[]; degerlendirme: ParselDegerlendirmesi | null };

function gunFarki(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}

async function musteriGetir(musteriId: string): Promise<Customer> {
  const user = await requireUser();
  const musteri = (await customers.list()).find((c) => c.id === musteriId);
  if (!musteri || !canAccessCustomer(user, musteri.sorumluMuhendisId)) {
    throw new Error("Bu müşteriye erişim yetkiniz yok.");
  }
  return musteri;
}

async function parselGetir(musteriId: string, parcelId: string): Promise<{ musteri: Customer; parcel: Parcel }> {
  const musteri = await musteriGetir(musteriId);
  const parcel = await parcelsRepo.get(musteriId, parcelId);
  if (!parcel) throw new Error("Parsel bulunamadı.");
  return { musteri, parcel };
}

// Haftalık/Özet için — topraq.ai'den istenen aralığı kapsayacak kadar geriye
// gün çeker (musteriler/[id]/page.tsx'teki sabit 90 günlük fetch'in aynısı,
// sadece istenen tarih aralığına göre parametrik).
async function havaVerileriniTopla(parcels: Parcel[], enErkenTarih: string): Promise<Record<string, HavaGunlukOzet[] | null>> {
  const bugunIso = new Date().toISOString().slice(0, 10);
  const gunSayisi = Math.max(90, gunFarki(enErkenTarih, bugunIso) + 14);
  const havaVerileri: Record<string, HavaGunlukOzet[] | null> = {};
  await Promise.all(
    parcels
      .filter((p) => p.topraqEslesme)
      .map(async (p) => {
        try {
          havaVerileri[p.id] = await istasyonGunlukOzet(p.topraqEslesme!.customerId, p.topraqEslesme!.fieldId, gunSayisi);
        } catch {
          havaVerileri[p.id] = null;
        }
      }),
  );
  return havaVerileri;
}

export async function raporVerisiGetir(params: RaporVerisiParams): Promise<RaporGorunumVerisi> {
  const { raporTuruId } = params;

  switch (raporTuruId) {
    case "haftalik": {
      if (!params.musteriId || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const musteri = await musteriGetir(params.musteriId);
      const tumParceller = await parcelsRepo.list(musteri.id);
      const parcels = params.parselIds?.length ? tumParceller.filter((p) => params.parselIds!.includes(p.id)) : tumParceller;
      const [records, recordTypes, gorevler] = await Promise.all([
        recordsRepo.listByCustomer(musteri.id),
        recordTypesRepo.list(),
        gorevlerRepo.list(musteri.id),
      ]);
      const ilkHafta = haftaBaslangiciBul(params.baslangic);
      const sonHafta = haftaBaslangiciBul(params.bitis);
      const havaVerileri = await havaVerileriniTopla(parcels, ilkHafta);

      const haftalar: { haftaBaslangic: string; haftaBitis: string; veri: HaftalikRaporVerisi }[] = [];
      let cursor = ilkHafta;
      let guvenlikSayaci = 0;
      while (cursor <= sonHafta && guvenlikSayaci < 104) {
        guvenlikSayaci++;
        const veri = haftalikRaporVerisiHazirla({
          haftaBaslangic: cursor,
          parcelIds: parcels.map((p) => p.id),
          parcels,
          havaVerileri,
          records,
          recordTypes,
          gorevler,
        });
        haftalar.push({ haftaBaslangic: cursor, haftaBitis: haftaBitisiBul(cursor), veri });
        const sonraki = new Date(cursor + "T00:00:00Z");
        sonraki.setUTCDate(sonraki.getUTCDate() + 7);
        cursor = sonraki.toISOString().slice(0, 10);
      }
      return { tur: "haftalik", customerAdi: musteri.ad, haftalar };
    }

    case "ozet": {
      if (!params.musteriId || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const musteri = await musteriGetir(params.musteriId);
      const parcels = await parcelsRepo.list(musteri.id);
      const [records, recordTypes, gorevler] = await Promise.all([
        recordsRepo.listByCustomer(musteri.id),
        recordTypesRepo.list(),
        gorevlerRepo.list(musteri.id),
      ]);
      const ilkHafta = haftaBaslangiciBul(params.baslangic);
      const sonHafta = haftaBaslangiciBul(params.bitis);
      const haftaSayisi = Math.max(1, Math.round(gunFarki(ilkHafta, sonHafta) / 7) + 1);
      const havaVerileri = await havaVerileriniTopla(parcels, ilkHafta);
      const haftalar = haftalikOzetHesapla({ parcels, havaVerileri, records, recordTypes, gorevler, haftaSayisi, bugun: params.bitis });
      return { tur: "ozet", customerAdi: musteri.ad, haftalar };
    }

    case "gunluk-saha": {
      if (!params.musteriId || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const musteri = await musteriGetir(params.musteriId);
      const tumParceller = await parcelsRepo.list(musteri.id);
      const parcels = params.parselIds?.length ? tumParceller.filter((p) => params.parselIds!.includes(p.id)) : tumParceller;
      const [records, recordTypes] = await Promise.all([recordsRepo.listByCustomer(musteri.id), recordTypesRepo.list()]);
      const ilacTuru = recordTypes.find((t) => t.ad === "İlaçlama");

      const satirlar: GunlukSatir[] = [];
      let cursor = params.baslangic;
      let no = 0;
      while (cursor <= params.bitis) {
        for (const parcel of parcels) {
          const gununKayitlari = records.filter((r) => r.parcelId === parcel.id && r.tarih === cursor);
          if (gununKayitlari.length === 0) continue;
          const anaKayit = gununKayitlari[0]!;
          const ilacKaydi = gununKayitlari.find((r) => r.recordTypeId === ilacTuru?.id);
          no++;
          satirlar.push({
            tarih: cursor,
            no,
            parcelAdi: parcel.ad,
            durum: anaKayit.durum || "",
            gozlem: anaKayit.not || "",
            recete: (ilacKaydi?.values?.recete as string) || "",
            donem: anaKayit.fenolojikDonem || "",
            oncelikPuani: anaKayit.oncelikPuani ?? null,
          });
        }
        const sonraki = new Date(cursor + "T00:00:00Z");
        sonraki.setUTCDate(sonraki.getUTCDate() + 1);
        cursor = sonraki.toISOString().slice(0, 10);
      }
      return { tur: "gunluk-saha", customerAdi: musteri.ad, toplamParselSayisi: parcels.length, satirlar };
    }

    case "ygp": {
      if (!params.musteriId || !params.yil) throw new Error("Eksik parametre.");
      const musteri = await musteriGetir(params.musteriId);
      const parcels = await parcelsRepo.list(musteri.id);
      const planlar = await yaprakGubrelemePlanlari.listByYil(musteri.id, params.yil);
      const degerlerByParcel: Record<string, Record<string, number>> = {};
      for (const parcel of parcels) {
        const plan = planlar.find((p) => p.parcelId === parcel.id);
        degerlerByParcel[parcel.id] = plan?.degerler ?? {};
      }
      return { tur: "ygp", customerAdi: musteri.ad, yil: params.yil, parcels, degerlerByParcel };
    }

    case "sulama-uyumu": {
      if (!params.musteriId || !params.parselIds?.[0] || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const { musteri, parcel } = await parselGetir(params.musteriId, params.parselIds[0]);
      const [planlar, recordTypes, tumKayitlar] = await Promise.all([
        sulamaPlanlari.list(params.musteriId, parcel.id),
        recordTypesRepo.list(),
        recordsRepo.list(params.musteriId, parcel.id),
      ]);
      const sulamaTipi = recordTypes.find((t) => t.ad.toLocaleLowerCase("tr") === "sulama");
      const uygulananTarihler = tumKayitlar.filter((r) => r.recordTypeId === sulamaTipi?.id).map((r) => r.tarih);

      const { baslangic, bitis } = params as { baslangic: string; bitis: string };
      const planGorunumleri = planlar
        .filter((plan) => plan.donemBaslangic <= bitis && plan.donemBitis >= baslangic)
        .map((plan) => {
          const sonuc = sulamaUyumuHesapla(plan.planlananTarihler, uygulananTarihler);
          const gunler = sonuc.gunler.filter((g) => g.tarih >= baslangic && g.tarih <= bitis);
          return { plan, gunler };
        });
      return { tur: "sulama-uyumu", musteriAdi: musteri.ad, parcel, planGorunumleri };
    }

    case "gelir-gider": {
      if (!params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const user = await requireUser();
      const [tumKayitlar, tumMusteriler] = await Promise.all([gelirGiderKayitlari.list(), customers.list()]);
      const erisilebilirMusteriler = tumMusteriler.filter((c) => canAccessCustomer(user, c.sorumluMuhendisId));
      const musteriMap = Object.fromEntries(erisilebilirMusteriler.map((c) => [c.id, c.ad]));
      const kayitlar = tumKayitlar.filter((k) => {
        if (k.tarih < params.baslangic! || k.tarih > params.bitis!) return false;
        if (params.musteriId && k.customerId !== params.musteriId) return false;
        // Müşteriye bağlı kayıtlar sadece erişilebilir müşterilerden gösterilir; customerId'siz (genel) kayıtlar herkese açık.
        if (k.customerId && !musteriMap[k.customerId]) return false;
        return true;
      });
      return { tur: "gelir-gider", kayitlar, musteriMap };
    }

    case "beslenme": {
      if (!params.musteriId || !params.parselIds?.[0] || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const { musteri, parcel } = await parselGetir(params.musteriId, params.parselIds[0]);
      const planlar = await beslenmePlanlari.list(params.musteriId, parcel.id);
      const tumUygulamalar = await beslenmeUygulamalari.list(params.musteriId, parcel.id);
      const uygulamalar = tumUygulamalar.filter((u) => u.tarih >= params.baslangic! && u.tarih <= params.bitis!);
      const planGorunumleri = planlar.map((plan) => ({ plan, sonuc: beslenmePlaniHesapla(plan, parcel.alanDonum) }));
      return { tur: "beslenme", musteriAdi: musteri.ad, parcel, planGorunumleri, uygulamalar };
    }

    case "fertigasyon": {
      if (!params.musteriId || !params.parselIds?.[0] || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const { musteri, parcel } = await parselGetir(params.musteriId, params.parselIds[0]);
      const tumKayitlar = await fertigasyonKayitlari.list(params.musteriId, parcel.id);
      const kayitlar = tumKayitlar.filter((k) => k.tarih >= params.baslangic! && k.tarih <= params.bitis!);
      const kayitGorunumleri = kayitlar.map((kayit) => ({ kayit, sonuc: fertigasyonHesapla(kayit) }));
      return { tur: "fertigasyon", musteriAdi: musteri.ad, parcel, kayitGorunumleri };
    }

    case "ziyaret": {
      if (!params.musteriId || !params.baslangic || !params.bitis) throw new Error("Eksik parametre.");
      const musteri = await musteriGetir(params.musteriId);
      const [tumKayitlar, parcels, recordTypes] = await Promise.all([
        recordsRepo.listByCustomer(musteri.id),
        parcelsRepo.list(musteri.id),
        recordTypesRepo.list(),
      ]);
      const kayitlar = tumKayitlar
        .filter((r) => r.tarih >= params.baslangic! && r.tarih <= params.bitis!)
        .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.createdAt.localeCompare(a.createdAt));
      const parcelAdMap = Object.fromEntries(parcels.map((p) => [p.id, p.ad]));
      const recordTypeMap = Object.fromEntries(recordTypes.map((t) => [t.id, t]));
      return { tur: "ziyaret", customerAdi: musteri.ad, kayitlar, parcelAdMap, recordTypeMap };
    }

    case "degerlendirme": {
      if (!params.musteriId || !params.parselIds?.[0] || !params.yil) throw new Error("Eksik parametre.");
      const { musteri, parcel } = await parselGetir(params.musteriId, params.parselIds[0]);
      const yil = String(params.yil);
      const [sorular, degerlendirme] = await Promise.all([
        degerlendirmeSorulari.list(),
        parselDegerlendirmeleri.get(params.musteriId, parcel.id, yil),
      ]);
      return {
        tur: "degerlendirme",
        musteriAdi: musteri.ad,
        parcel,
        yil,
        sorular: sorular.filter((s) => soruParselIcinGecerli(s, parcel.id)),
        degerlendirme,
      };
    }

    default:
      throw new Error(`Bilinmeyen rapor türü: ${raporTuruId}`);
  }
}
