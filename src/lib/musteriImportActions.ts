"use server";

import { revalidatePath } from "next/cache";
import { customers, parcels } from "./repositories";
import { requireUser, canAccessCustomer } from "./session";
import { dosyaOku, MAKS_SATIR, type ExcelSatiri, type ParselSatiri, type HamMusteri, type HamParsel } from "./musteriExcel";
import { blockNoUret } from "./yaprakGubrelemePlani";
import { hesaplaAgacSayisi } from "./parcelForm";
import type { User } from "@/types";

const MAKS_BOYUT = 5 * 1024 * 1024;
const anahtar = (s: string) => s.trim().toLocaleLowerCase("tr");

type DogrulanmisParsel = ParselSatiri & { hedefId?: string; hedefYeni?: string };

// Ham Excel satırlarını veritabanıyla karşılaştırıp her satıra durum verir.
async function dogrula(ham: { musteriler: HamMusteri[]; parseller: HamParsel[] }, user: User) {
  const mevcut = await customers.list();
  const mevcutAdlar = new Map<string, typeof mevcut>();
  for (const c of mevcut) mevcutAdlar.set(anahtar(c.ad), [...(mevcutAdlar.get(anahtar(c.ad)) ?? []), c]);

  // --- müşteri satırları
  const gorulen = new Set<string>();
  const dosyaMusteriDurumu = new Map<string, ExcelSatiri["durum"]>(); // anahtar → ilk satırın durumu
  const musteriler: ExcelSatiri[] = ham.musteriler.map((m) => {
    const k = anahtar(m.ad);
    let durum: ExcelSatiri["durum"] = "eklenecek";
    let mesaj: string | undefined;
    if (m.hata) {
      durum = "hatali";
      mesaj = m.hata;
    } else if (mevcutAdlar.has(k)) {
      durum = "atlanacak";
      mesaj = "Bu isimde müşteri zaten kayıtlı.";
    } else if (gorulen.has(k)) {
      durum = "atlanacak";
      mesaj = "Dosyada bu isim daha önce geçiyor.";
    }
    if (m.ad) {
      gorulen.add(k);
      if (!dosyaMusteriDurumu.has(k)) dosyaMusteriDurumu.set(k, durum);
    }
    return { satir: m.satir, ad: m.ad, adres: m.adres, ilgiliKisiler: m.ilgiliKisiler, durum, mesaj };
  });

  // --- parsel satırları
  const mevcutParselAdlari = new Set<string>(); // `${müşteriId}|${parselAdı}`
  for (const c of mevcut) for (const p of await parcels.list(c.id)) mevcutParselAdlari.add(`${c.id}|${anahtar(p.ad)}`);
  const parselGorulen = new Set<string>();

  const parseller: DogrulanmisParsel[] = ham.parseller.map((p) => {
    const k = anahtar(p.musteriAdi);
    let hedefId: string | undefined;
    let hedefYeni: string | undefined;
    let hata = p.hata;

    if (!hata) {
      const adaylar = mevcutAdlar.get(k);
      if (adaylar && adaylar.length > 1) {
        hata = "Bu isimde birden fazla müşteri kayıtlı, hangisi olduğu anlaşılamıyor.";
      } else if (adaylar) {
        if (!canAccessCustomer(user, adaylar[0].sorumluMuhendisId)) hata = "Bu müşteriye parsel ekleme yetkiniz yok.";
        else hedefId = adaylar[0].id;
      } else if (dosyaMusteriDurumu.get(k) === "eklenecek") {
        hedefYeni = k;
      } else if (dosyaMusteriDurumu.has(k)) {
        hata = "Müşterinin Müşteriler sayfasındaki satırı hatalı olduğu için eklenemez.";
      } else {
        hata = `Müşteri bulunamadı: ${p.musteriAdi}. Müşteriler sayfasına ekleyin ya da adı birebir yazın.`;
      }
    }

    let durum: ParselSatiri["durum"] = "eklenecek";
    let mesaj: string | undefined;
    if (hata) {
      durum = "hatali";
      mesaj = hata;
    } else {
      const parselAnahtari = `${hedefId ?? `yeni:${hedefYeni}`}|${anahtar(p.ad)}`;
      if (hedefId && mevcutParselAdlari.has(parselAnahtari)) {
        durum = "atlanacak";
        mesaj = "Bu müşteride bu isimde parsel zaten kayıtlı.";
      } else if (parselGorulen.has(parselAnahtari)) {
        durum = "atlanacak";
        mesaj = "Dosyada bu müşteri için bu parsel adı daha önce geçiyor.";
      }
      parselGorulen.add(parselAnahtari);
    }

    const agacSayisi =
      p.agacSayisi ??
      (p.siraArasi && p.siraUzeri ? (hesaplaAgacSayisi(p.alanDonum, p.siraArasi, p.siraUzeri) ?? undefined) : undefined);
    return { ...p, agacSayisi, durum, mesaj, hedefId, hedefYeni };
  });

  return { musteriler, parseller };
}

async function satirlariHazirla(formData: FormData, user: User) {
  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) throw new Error("Lütfen bir Excel dosyası seçin.");
  if (!/\.xlsx$/i.test(dosya.name)) throw new Error("Sadece .xlsx uzantılı Excel dosyaları desteklenir.");
  if (dosya.size > MAKS_BOYUT) throw new Error("Dosya çok büyük (en fazla 5 MB).");

  let ham;
  try {
    ham = await dosyaOku(Buffer.from(await dosya.arrayBuffer()));
  } catch (e) {
    if (e instanceof Error && /şablona uymuyor|sayfa bulunamadı/.test(e.message)) throw e;
    throw new Error("Dosya okunamadı. Geçerli bir .xlsx dosyası olduğundan emin olun.");
  }
  if (ham.musteriler.length === 0 && ham.parseller.length === 0) throw new Error("Dosyada içe aktarılacak satır bulunamadı.");
  if (ham.musteriler.length > MAKS_SATIR || ham.parseller.length > MAKS_SATIR) {
    throw new Error(`Her sayfada en fazla ${MAKS_SATIR} satır içe aktarılabilir.`);
  }
  return dogrula(ham, user);
}

export type OnizlemeSonucu = { musteriler: ExcelSatiri[]; parseller: ParselSatiri[] } | { hata: string };

// Hiçbir şey kaydetmez — dosyayı okuyup her satırın ne olacağını gösterir.
export async function musteriExcelOnizleAction(formData: FormData): Promise<OnizlemeSonucu> {
  const user = await requireUser();
  try {
    const { musteriler, parseller } = await satirlariHazirla(formData, user);
    return {
      musteriler,
      parseller: parseller.map(({ hedefId: _h, hedefYeni: _y, ...p }) => p),
    };
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Dosya okunamadı." };
  }
}

export type IceAktarSonucu =
  | { musteriEklenen: number; parselEklenen: number; atlanan: number; hatali: number }
  | { hata: string };

// Dosya sunucuda yeniden okunur ve doğrulanır — istemciden gelen önizleme verisine güvenilmez.
export async function musteriExcelIceAktarAction(formData: FormData): Promise<IceAktarSonucu> {
  const user = await requireUser();
  try {
    const { musteriler, parseller } = await satirlariHazirla(formData, user);

    const yeniIdler = new Map<string, string>(); // müşteri anahtarı → yeni id
    const yeniAdlar = new Map<string, string>();
    let musteriEklenen = 0;
    for (const s of musteriler) {
      if (s.durum !== "eklenecek") continue;
      const c = await customers.create({ ad: s.ad, adres: s.adres, ilgiliKisiler: s.ilgiliKisiler, sorumluMuhendisId: user.id });
      yeniIdler.set(anahtar(s.ad), c.id);
      yeniAdlar.set(c.id, c.ad);
      musteriEklenen++;
    }

    const tumMusteriler = await customers.list();
    let parselEklenen = 0;
    for (const p of parseller) {
      if (p.durum !== "eklenecek") continue;
      const musteriId = p.hedefId ?? (p.hedefYeni ? yeniIdler.get(p.hedefYeni) : undefined);
      const musteri = tumMusteriler.find((c) => c.id === musteriId);
      if (!musteriId || !musteri) continue;
      const mevcutBlokNolar = (await parcels.list(musteriId)).map((x) => x.blockNo).filter(Boolean);
      await parcels.create(musteriId, {
        ad: p.ad,
        alanDonum: p.alanDonum,
        urunler: p.urunler,
        blockNo: blockNoUret(musteri.ad, mevcutBlokNolar),
        sulamaSekli: p.sulamaSekli,
        siraArasi: p.siraArasi,
        siraUzeri: p.siraUzeri,
        agacSayisi: p.agacSayisi,
      });
      parselEklenen++;
    }

    revalidatePath("/musteriler");
    const tum = [...musteriler, ...parseller];
    return {
      musteriEklenen,
      parselEklenen,
      atlanan: tum.filter((s) => s.durum === "atlanacak").length,
      hatali: tum.filter((s) => s.durum === "hatali").length,
    };
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "İçe aktarma başarısız oldu." };
  }
}
