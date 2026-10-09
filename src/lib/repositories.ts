import { readCollection, writeCollection, insertOne, updateOne, deleteOne, newId } from "./db";
import type {
  User,
  PasswordReset,
  Customer,
  Parcel,
  Well,
  Gorev,
  RecordTypeDef,
  FieldRecord,
  BeslenmePlani,
  BeslenmeUygulamaKaydi,
  FertigasyonKaydi,
  SulamaPlani,
  DegerlendirmeSorusu,
  ParselDegerlendirmesi,
  Revize,
  HastalikTanimi,
  YaprakGubrelemePlani,
  GelirGiderKaydi,
} from "@/types";

const COLLECTIONS = {
  users: "users",
  passwordResets: "password-resets",
  customers: "customers",
  parcels: "parcels",
  wells: "wells",
  gorevler: "gorevler",
  recordTypes: "record-types",
  records: "records",
  beslenmePlanlari: "beslenme-planlari",
  beslenmeUygulamalari: "beslenme-uygulamalari",
  fertigasyonKayitlari: "fertigasyon-kayitlari",
  sulamaPlanlari: "sulama-planlari",
  degerlendirmeSorulari: "degerlendirme-sorulari",
  parselDegerlendirmeleri: "parsel-degerlendirmeleri",
  hastalikTanimlari: "hastalik-tanimlari",
  yaprakGubrelemePlanlari: "yaprak-gubreleme-planlari",
  gelirGiderKayitlari: "gelir-gider-kayitlari",
  revizeler: "revizeler",
} as const;

export const users = {
  list: () => readCollection<User>(COLLECTIONS.users),
  create: (data: Omit<User, "id" | "createdAt">) =>
    insertOne<User>(COLLECTIONS.users, { ...data, id: newId(), createdAt: new Date().toISOString() }),
  update: (id: string, patch: Partial<User>) => updateOne<User>(COLLECTIONS.users, id, patch),
  delete: (id: string) => deleteOne(COLLECTIONS.users, id),
};

export const passwordResets = {
  list: () => readCollection<PasswordReset>(COLLECTIONS.passwordResets),
  create: (data: Omit<PasswordReset, "id" | "createdAt">) =>
    insertOne<PasswordReset>(COLLECTIONS.passwordResets, { ...data, id: newId(), createdAt: new Date().toISOString() }),
  update: (id: string, patch: Partial<PasswordReset>) =>
    updateOne<PasswordReset>(COLLECTIONS.passwordResets, id, patch),
};

export const customers = {
  list: () => readCollection<Customer>(COLLECTIONS.customers),
  create: (data: Omit<Customer, "id" | "createdAt">) =>
    insertOne<Customer>(COLLECTIONS.customers, { ...data, id: newId(), createdAt: new Date().toISOString() }),
  update: (id: string, patch: Partial<Customer>) => updateOne<Customer>(COLLECTIONS.customers, id, patch),
  remove: (id: string) => deleteOne(COLLECTIONS.customers, id),
};

export const parcels = {
  list: async (customerId: string) =>
    (await readCollection<Parcel>(COLLECTIONS.parcels)).filter((p) => p.customerId === customerId),
  get: async (customerId: string, parcelId: string) =>
    (await readCollection<Parcel>(COLLECTIONS.parcels)).find(
      (p) => p.id === parcelId && p.customerId === customerId,
    ) ?? null,
  create: (customerId: string, data: Omit<Parcel, "id" | "customerId" | "createdAt">) =>
    insertOne<Parcel>(COLLECTIONS.parcels, {
      ...data,
      customerId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  update: async (customerId: string, parcelId: string, patch: Partial<Parcel>) => {
    const items = await readCollection<Parcel>(COLLECTIONS.parcels);
    const exists = items.some((p) => p.id === parcelId && p.customerId === customerId);
    if (!exists) return null;
    return updateOne<Parcel>(COLLECTIONS.parcels, parcelId, patch);
  },
  remove: async (customerId: string, parcelId: string) => {
    const items = await readCollection<Parcel>(COLLECTIONS.parcels);
    const exists = items.some((p) => p.id === parcelId && p.customerId === customerId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.parcels, parcelId);
  },
};

export const wells = {
  list: async (customerId: string) =>
    (await readCollection<Well>(COLLECTIONS.wells)).filter((w) => w.customerId === customerId),
  create: (customerId: string, data: Omit<Well, "id" | "customerId" | "createdAt">) =>
    insertOne<Well>(COLLECTIONS.wells, {
      ...data,
      customerId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  update: async (customerId: string, wellId: string, patch: Partial<Well>) => {
    const items = await readCollection<Well>(COLLECTIONS.wells);
    const exists = items.some((w) => w.id === wellId && w.customerId === customerId);
    if (!exists) return null;
    return updateOne<Well>(COLLECTIONS.wells, wellId, patch);
  },
  remove: async (customerId: string, wellId: string) => {
    const items = await readCollection<Well>(COLLECTIONS.wells);
    const exists = items.some((w) => w.id === wellId && w.customerId === customerId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.wells, wellId);
  },
};

// Kayıt tipleri (Gübreleme, Sulama, Hastalık/Zararlı, Gözlem, Yaprak Gübresi,
// İlaçlama) — seed/record-types.json'dan gelir, salt okunur, kullanıcı tarafından
// oluşturulamaz/silinemez.
export const recordTypes = {
  list: () => readCollection<RecordTypeDef>(COLLECTIONS.recordTypes),
};

// Saha Kayıtları — Görevler ile aynı customerId-scoped CRUD deseni, ayrıca
// parcelId'ye göre de filtrelenir.
export const records = {
  list: async (customerId: string, parcelId: string) =>
    (await readCollection<FieldRecord>(COLLECTIONS.records))
      .filter((r) => r.customerId === customerId && r.parcelId === parcelId)
      .sort((a, b) => b.tarih.localeCompare(a.tarih)),
  listByCustomer: async (customerId: string) =>
    (await readCollection<FieldRecord>(COLLECTIONS.records)).filter((r) => r.customerId === customerId),
  // Global /kayitlar sayfası için — erişim filtresi çağıran tarafta yapılır
  // (musteriler.list().filter(canAccessCustomer) ile join edilerek).
  listAll: () => readCollection<FieldRecord>(COLLECTIONS.records),
  create: (
    customerId: string,
    parcelId: string,
    data: Omit<FieldRecord, "id" | "customerId" | "parcelId" | "createdAt">,
  ) =>
    insertOne<FieldRecord>(COLLECTIONS.records, {
      ...data,
      customerId,
      parcelId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  // gorevler.remove ile aynı desen — silmeden önce çağıran tarafta customerId
  // eşleşmesi kontrol edilir (bkz. actions.ts requireRecordAccess).
  remove: (customerId: string, recordId: string) => deleteOne(COLLECTIONS.records, recordId),
  // Ziyaret Kaydı sekmesi için eklendi — aynı gün aynı parselde zaten var olan
  // bir kaydı günceller (bkz. actions.ts createZiyaretKaydiAction), diğer
  // repository'lerdeki customerId+parcelId eşleşmesi kontrol edilip updateOne
  // çağrılan update deseninin aynısı.
  update: async (customerId: string, parcelId: string, recordId: string, patch: Partial<FieldRecord>) => {
    const items = await readCollection<FieldRecord>(COLLECTIONS.records);
    const exists = items.some((r) => r.id === recordId && r.customerId === customerId && r.parcelId === parcelId);
    if (!exists) return null;
    return updateOne<FieldRecord>(COLLECTIONS.records, recordId, patch);
  },
};

// Beslenme planları — records ile aynı customerId+parcelId-scoped CRUD deseni.
export const beslenmePlanlari = {
  list: async (customerId: string, parcelId: string) =>
    (await readCollection<BeslenmePlani>(COLLECTIONS.beslenmePlanlari)).filter(
      (p) => p.customerId === customerId && p.parcelId === parcelId,
    ),
  create: (customerId: string, parcelId: string, data: Omit<BeslenmePlani, "id" | "customerId" | "parcelId" | "createdAt">) =>
    insertOne<BeslenmePlani>(COLLECTIONS.beslenmePlanlari, {
      ...data,
      customerId,
      parcelId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  update: async (
    customerId: string,
    parcelId: string,
    planId: string,
    patch: Partial<BeslenmePlani>,
  ) => {
    const items = await readCollection<BeslenmePlani>(COLLECTIONS.beslenmePlanlari);
    const exists = items.some((p) => p.id === planId && p.customerId === customerId && p.parcelId === parcelId);
    if (!exists) return null;
    return updateOne<BeslenmePlani>(COLLECTIONS.beslenmePlanlari, planId, patch);
  },
  remove: async (customerId: string, parcelId: string, planId: string) => {
    const items = await readCollection<BeslenmePlani>(COLLECTIONS.beslenmePlanlari);
    const exists = items.some((p) => p.id === planId && p.customerId === customerId && p.parcelId === parcelId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.beslenmePlanlari, planId);
  },
};

// Beslenme uygulama kayıtları (gerçekleşen) — plana bağlı, tarihe göre yeniden eskiye sıralı.
export const beslenmeUygulamalari = {
  list: async (customerId: string, parcelId: string) =>
    (await readCollection<BeslenmeUygulamaKaydi>(COLLECTIONS.beslenmeUygulamalari))
      .filter((u) => u.customerId === customerId && u.parcelId === parcelId)
      .sort((a, b) => b.tarih.localeCompare(a.tarih)),
  create: (
    customerId: string,
    parcelId: string,
    planId: string,
    data: Omit<BeslenmeUygulamaKaydi, "id" | "customerId" | "parcelId" | "planId" | "createdAt">,
  ) =>
    insertOne<BeslenmeUygulamaKaydi>(COLLECTIONS.beslenmeUygulamalari, {
      ...data,
      customerId,
      parcelId,
      planId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  remove: async (customerId: string, parcelId: string, uygulamaId: string) => {
    const items = await readCollection<BeslenmeUygulamaKaydi>(COLLECTIONS.beslenmeUygulamalari);
    const exists = items.some((u) => u.id === uygulamaId && u.customerId === customerId && u.parcelId === parcelId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.beslenmeUygulamalari, uygulamaId);
  },
};

// Fertigasyon kayıtları — beslenmeUygulamalari ile aynı customerId+parcelId-
// scoped CRUD deseni, tarihe (sonra createdAt'e) göre yeniden eskiye sıralı.
export const fertigasyonKayitlari = {
  list: async (customerId: string, parcelId: string) =>
    (await readCollection<FertigasyonKaydi>(COLLECTIONS.fertigasyonKayitlari))
      .filter((k) => k.customerId === customerId && k.parcelId === parcelId)
      .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.createdAt.localeCompare(a.createdAt)),
  create: (
    customerId: string,
    parcelId: string,
    data: Omit<FertigasyonKaydi, "id" | "customerId" | "parcelId" | "createdAt">,
  ) =>
    insertOne<FertigasyonKaydi>(COLLECTIONS.fertigasyonKayitlari, {
      ...data,
      customerId,
      parcelId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  remove: async (customerId: string, parcelId: string, id: string) => {
    const items = await readCollection<FertigasyonKaydi>(COLLECTIONS.fertigasyonKayitlari);
    const exists = items.some((k) => k.id === id && k.customerId === customerId && k.parcelId === parcelId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.fertigasyonKayitlari, id);
  },
};

// Sulama planları — fertigasyonKayitlari ile aynı customerId+parcelId-scoped
// CRUD deseni, dönem başlangıcına göre yeniden eskiye sıralı. "Gerçekleşen"
// tarafı burada tutulmaz — o veri records repository'sinden (Sulama tipi)
// okunur, bkz. sulama-uyumu/page.tsx.
export const sulamaPlanlari = {
  list: async (customerId: string, parcelId: string) =>
    (await readCollection<SulamaPlani>(COLLECTIONS.sulamaPlanlari))
      .filter((p) => p.customerId === customerId && p.parcelId === parcelId)
      .sort((a, b) => b.donemBaslangic.localeCompare(a.donemBaslangic)),
  create: (
    customerId: string,
    parcelId: string,
    data: Omit<SulamaPlani, "id" | "customerId" | "parcelId" | "createdAt">,
  ) =>
    insertOne<SulamaPlani>(COLLECTIONS.sulamaPlanlari, {
      ...data,
      customerId,
      parcelId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  remove: async (customerId: string, parcelId: string, planId: string) => {
    const items = await readCollection<SulamaPlani>(COLLECTIONS.sulamaPlanlari);
    const exists = items.some((p) => p.id === planId && p.customerId === customerId && p.parcelId === parcelId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.sulamaPlanlari, planId);
  },
};

export const gorevler = {
  list: async (customerId: string) =>
    (await readCollection<Gorev>(COLLECTIONS.gorevler)).filter((g) => g.customerId === customerId),
  create: (customerId: string, data: Omit<Gorev, "id" | "customerId" | "createdAt">) =>
    insertOne<Gorev>(COLLECTIONS.gorevler, {
      ...data,
      customerId,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  update: async (customerId: string, gorevId: string, patch: Partial<Gorev>) => {
    const items = await readCollection<Gorev>(COLLECTIONS.gorevler);
    const exists = items.some((g) => g.id === gorevId && g.customerId === customerId);
    if (!exists) return null;
    return updateOne<Gorev>(COLLECTIONS.gorevler, gorevId, patch);
  },
  remove: async (customerId: string, gorevId: string) => {
    const items = await readCollection<Gorev>(COLLECTIONS.gorevler);
    const exists = items.some((g) => g.id === gorevId && g.customerId === customerId);
    if (!exists) return false;
    return deleteOne(COLLECTIONS.gorevler, gorevId);
  },
};

// Genel Değerlendirme soruları — recordTypes gibi customerId/parcelId'ye
// bağlı olmayan global bir koleksiyon, ama recordTypes'tan farklı olarak
// salt okunur değil: yönetici (rol === "admin") ekleyip/düzenleyip silebilir
// (bkz. actions.ts requireAdmin).
export const degerlendirmeSorulari = {
  list: async () =>
    (await readCollection<DegerlendirmeSorusu>(COLLECTIONS.degerlendirmeSorulari)).sort(
      (a, b) => a.siraNo - b.siraNo,
    ),
  create: async (data: Pick<DegerlendirmeSorusu, "soru" | "tip" | "secenekler" | "parselIds">) => {
    const mevcutlar = await readCollection<DegerlendirmeSorusu>(COLLECTIONS.degerlendirmeSorulari);
    const siraNo = mevcutlar.length ? Math.max(...mevcutlar.map((s) => s.siraNo)) + 1 : 1;
    return insertOne<DegerlendirmeSorusu>(COLLECTIONS.degerlendirmeSorulari, {
      ...data,
      id: newId(),
      siraNo,
      createdAt: new Date().toISOString(),
    });
  },
  update: (id: string, data: Pick<DegerlendirmeSorusu, "soru" | "tip" | "secenekler" | "parselIds">) =>
    updateOne<DegerlendirmeSorusu>(COLLECTIONS.degerlendirmeSorulari, id, data),
  remove: (id: string) => deleteOne(COLLECTIONS.degerlendirmeSorulari, id),
};

// Parsel bazlı Genel Değerlendirme cevapları — customerId+parcelId+yil ile
// scoped, yıl başına tekil kayıt (kaydet upsert yapar).
export const parselDegerlendirmeleri = {
  get: async (customerId: string, parcelId: string, yil: string) =>
    (await readCollection<ParselDegerlendirmesi>(COLLECTIONS.parselDegerlendirmeleri)).find(
      (d) => d.customerId === customerId && d.parcelId === parcelId && d.yil === yil,
    ) ?? null,
  // Bir parselin değerlendirmesi olan tüm yılları döner — yıl seçici bu listeden kurulur.
  yillariListele: async (customerId: string, parcelId: string) =>
    (await readCollection<ParselDegerlendirmesi>(COLLECTIONS.parselDegerlendirmeleri))
      .filter((d) => d.customerId === customerId && d.parcelId === parcelId)
      .map((d) => d.yil),
  // yil+parcel için var olan kaydı GÜNCELLER, yoksa YENİ oluşturur (upsert).
  kaydet: async (
    customerId: string,
    parcelId: string,
    yil: string,
    cevaplar: ParselDegerlendirmesi["cevaplar"],
  ) => {
    const items = await readCollection<ParselDegerlendirmesi>(COLLECTIONS.parselDegerlendirmeleri);
    const mevcut = items.find((d) => d.customerId === customerId && d.parcelId === parcelId && d.yil === yil);
    if (mevcut) {
      return updateOne<ParselDegerlendirmesi>(COLLECTIONS.parselDegerlendirmeleri, mevcut.id, { cevaplar });
    }
    return insertOne<ParselDegerlendirmesi>(COLLECTIONS.parselDegerlendirmeleri, {
      id: newId(),
      customerId,
      parcelId,
      yil,
      cevaplar,
      createdAt: new Date().toISOString(),
    });
  },
};

// Hastalık/Zararlı tanımları — degerlendirmeSorulari gibi customerId/parcelId'ye
// bağlı olmayan global bir koleksiyon, yönetici ekleyip silebilir (güncelleme yok).
// Kayıtlar'daki "Hastalık / Zararlı" tipinin "Etken/Zararlı" alanı bu listeden
// seçilir (bkz. YeniKayitForm.tsx).
// Başlangıç listesi: canlıda data/ dosyası zaten oluşmuş olduğu için seed/ klasörü işe yaramıyor;
// bu yüzden liste ilk okunuşta BİR KEZ eklenir ve bir bayrakla işaretlenir (data/sistem-bayraklari.json).
// Sonradan yönetici silerse geri gelmez, yeni bir varsayılan eklemek için bayrak adındaki sürümü (v2…) artırın.
const HASTALIK_VARSAYILANLARI = [
  "Kırmızı örümcek",
  "Kırmızı örümcek yumurtası",
  "Yaprak biti",
  "Galeri güvesi",
  "Unlu bit",
  "Pas",
  "Kabuklu bit",
];
const HASTALIK_BAYRAGI = "hastalik-varsayilanlari-v1";
let hastalikTohumu: Promise<void> | null = null;

async function hastalikVarsayilanlariniEkle() {
  const bayraklar = await readCollection<{ id: string }>("sistem-bayraklari");
  if (bayraklar.some((b) => b.id === HASTALIK_BAYRAGI)) return;
  const mevcut = await readCollection<HastalikTanimi>(COLLECTIONS.hastalikTanimlari);
  const mevcutAdlar = new Set(mevcut.map((h) => h.ad.trim().toLocaleLowerCase("tr")));
  const simdi = new Date().toISOString();
  const yeniler = HASTALIK_VARSAYILANLARI.filter((ad) => !mevcutAdlar.has(ad.toLocaleLowerCase("tr"))).map(
    (ad) => ({ id: newId(), ad, createdAt: simdi }),
  );
  if (yeniler.length > 0) await writeCollection(COLLECTIONS.hastalikTanimlari, [...mevcut, ...yeniler]);
  await writeCollection("sistem-bayraklari", [...bayraklar, { id: HASTALIK_BAYRAGI, createdAt: simdi }]);
}

export const hastalikTanimlari = {
  list: async () => {
    // Eşzamanlı ilk isteklerde çift eklenmesin diye tek bir söz (promise) paylaşılır.
    hastalikTohumu ??= hastalikVarsayilanlariniEkle().catch((e) => {
      hastalikTohumu = null;
      throw e;
    });
    await hastalikTohumu;
    return (await readCollection<HastalikTanimi>(COLLECTIONS.hastalikTanimlari)).sort((a, b) =>
      a.ad.localeCompare(b.ad, "tr"),
    );
  },
  create: (ad: string) =>
    insertOne<HastalikTanimi>(COLLECTIONS.hastalikTanimlari, { id: newId(), ad, createdAt: new Date().toISOString() }),
  update: (id: string, ad: string) => updateOne<HastalikTanimi>(COLLECTIONS.hastalikTanimlari, id, { ad }),
  remove: (id: string) => deleteOne(COLLECTIONS.hastalikTanimlari, id),
};

// Yaprak Gübreleme Planı — parselDegerlendirmeleri ile aynı customerId+
// parcelId+yil-scoped get+upsert deseni. Şablon (ürün/dönem/alt-sütun yapısı)
// sabit ve src/lib/yaprakGubrelemePlani.ts'de kodlu, burada sadece o
// şablondaki alanlara girilen sayılar (degerler) tutulur.
export const yaprakGubrelemePlanlari = {
  list: async (customerId: string, parcelId: string) =>
    (await readCollection<YaprakGubrelemePlani>(COLLECTIONS.yaprakGubrelemePlanlari))
      .filter((p) => p.customerId === customerId && p.parcelId === parcelId)
      .sort((a, b) => b.yil - a.yil),
  // Yaprak Gübreleme Planı sayfası müşterinin TÜM parsellerini tek tabloda
  // (Excel'deki gibi) gösterir — bu yüzden tek bir yıl için müşterinin tüm
  // parsellerindeki planları bir arada okumaya ihtiyaç var.
  listByYil: async (customerId: string, yil: number) =>
    (await readCollection<YaprakGubrelemePlani>(COLLECTIONS.yaprakGubrelemePlanlari)).filter(
      (p) => p.customerId === customerId && p.yil === yil,
    ),
  get: async (customerId: string, parcelId: string, yil: number) =>
    (await readCollection<YaprakGubrelemePlani>(COLLECTIONS.yaprakGubrelemePlanlari)).find(
      (p) => p.customerId === customerId && p.parcelId === parcelId && p.yil === yil,
    ) ?? null,
  // yil+parcel için var olan kaydı GÜNCELLER, yoksa YENİ oluşturur (upsert).
  kaydet: async (customerId: string, parcelId: string, yil: number, degerler: Record<string, number>) => {
    const items = await readCollection<YaprakGubrelemePlani>(COLLECTIONS.yaprakGubrelemePlanlari);
    const mevcut = items.find((p) => p.customerId === customerId && p.parcelId === parcelId && p.yil === yil);
    const simdi = new Date().toISOString();
    if (mevcut) {
      return updateOne<YaprakGubrelemePlani>(COLLECTIONS.yaprakGubrelemePlanlari, mevcut.id, {
        degerler,
        guncellendiAt: simdi,
      });
    }
    return insertOne<YaprakGubrelemePlani>(COLLECTIONS.yaprakGubrelemePlanlari, {
      id: newId(),
      customerId,
      parcelId,
      yil,
      degerler,
      createdAt: simdi,
      guncellendiAt: simdi,
    });
  },
};

// Gelir Gider kayıtları — hastalikTanimlari gibi global bir koleksiyon, ama
// onlardan farklı olarak yönetici kısıtlaması
// YOK: finansal kayıtlar tüm mühendisler için ortak/paylaşılan veridir,
// herkes ekleyip/silebilir (bkz. actions.ts — sadece requireUser() yeterli).
// customerId opsiyonel taşınabilir ama repository customerId'ye göre
// SCOPE/filtre yapmaz — bu bilinçli bir karar (bkz. görev tanımı).
export const gelirGiderKayitlari = {
  list: async () =>
    (await readCollection<GelirGiderKaydi>(COLLECTIONS.gelirGiderKayitlari)).sort(
      (a, b) => b.tarih.localeCompare(a.tarih) || b.createdAt.localeCompare(a.createdAt),
    ),
  create: (data: Omit<GelirGiderKaydi, "id" | "createdAt">) =>
    insertOne<GelirGiderKaydi>(COLLECTIONS.gelirGiderKayitlari, {
      ...data,
      id: newId(),
      createdAt: new Date().toISOString(),
    }),
  remove: (id: string) => deleteOne(COLLECTIONS.gelirGiderKayitlari, id),
};

// Revizeler — yardım botundan gelen sayfa bazlı değişiklik talepleri.
export const revizeler = {
  list: async () =>
    (await readCollection<Revize>(COLLECTIONS.revizeler)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  create: (data: Omit<Revize, "id" | "createdAt" | "durum">) =>
    insertOne<Revize>(COLLECTIONS.revizeler, {
      ...data,
      id: newId(),
      durum: "acik",
      createdAt: new Date().toISOString(),
    }),
  update: (id: string, patch: Partial<Revize>) => updateOne<Revize>(COLLECTIONS.revizeler, id, patch),
  remove: (id: string) => deleteOne(COLLECTIONS.revizeler, id),
};
