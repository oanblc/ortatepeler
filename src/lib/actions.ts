"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  users,
  passwordResets,
  customers,
  parcels,
  wells,
  gorevler,
  recordTypes,
  records,
  beslenmePlanlari,
  beslenmeUygulamalari,
  fertigasyonKayitlari,
  sulamaPlanlari,
  degerlendirmeSorulari,
  parselDegerlendirmeleri,
  hastalikTanimlari,
  yaprakGubrelemePlanlari,
  gelirGiderKayitlari,
} from "./repositories";
import { parselEslestir } from "./topraq";
import { blockNoUret } from "./yaprakGubrelemePlani";
import type {
  LatLng,
  ParcelUrun,
  IlgiliKisi,
  GorevDurumu,
  BeslenmeUrun,
  FertigasyonUrun,
  GelirGiderTur,
  User,
  DegerlendirmeSoruTipi,
  ParselDegerlendirmesi,
} from "@/types";
import { soruTipi, soruParselIcinGecerli } from "./degerlendirme";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  hashPassword,
  signSessionToken,
  verifyPassword,
  generateResetToken,
  hashResetToken,
} from "./auth";
import { sendPasswordResetEmail } from "./email";
import { requireUser, canAccessCustomer } from "./session";
import { formatTelefon } from "./format";

const RESET_TOKEN_GECERLILIK_MS = 60 * 60 * 1000; // 1 saat

export type LoginState = { error: string; email?: string } | null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const beniHatirla = formData.get("remember") != null;

  const user = (await users.list()).find((u) => u.email.toLowerCase() === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // email geri döner: React 19 işlem sonrası formu sıfırlıyor, kullanıcı e-postasını yeniden yazmak zorunda kalmasın.
    return { error: "E-posta veya şifre hatalı.", email };
  }

  // "Saha girişi" butonu (mobil/PWA): oturum telefonda uygulama kapanınca düşmesin diye
  // her zaman kalıcı çerezle açılır ve doğrudan /saha'ya yönlendirilir.
  const sahaGirisi = formData.get("hedef") === "saha";

  const token = await signSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(beniHatirla || sahaGirisi ? { maxAge: SESSION_MAX_AGE } : {}),
  });

  redirect(sahaGirisi ? "/saha" : "/panel");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/giris");
}

export type RegisterState = { error: string } | null;

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const ad = String(formData.get("ad") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const kosullarKabul = formData.get("terms") != null;

  if (!ad || !email || !password) return { error: "Tüm alanları doldurun." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (password !== password2) return { error: "Şifreler eşleşmiyor." };
  if (!kosullarKabul) return { error: "Devam etmek için kullanım koşullarını kabul edin." };

  const existing = (await users.list()).find((u) => u.email.toLowerCase() === email);
  if (existing) return { error: "Bu e-posta ile zaten bir hesap var." };

  const passwordHash = await hashPassword(password);
  // Kendi kendine kayıt olan hesap hiçbir zaman admin olmaz — hiçbir
  // müşteriye atanmadan mühendis olarak başlar.
  const user = await users.create({ ad, email, passwordHash, rol: "muhendis" });

  const token = await signSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/panel");
}

export type ForgotPasswordState = { sent: true; email: string } | { error: string } | null;

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "E-posta girin." };

  const user = (await users.list()).find((u) => u.email.toLowerCase() === email);
  if (user) {
    const token = generateResetToken();
    await passwordResets.create({
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_GECERLILIK_MS).toISOString(),
      used: false,
    });

    const h = await headers();
    const origin = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    await sendPasswordResetEmail(user.email, `${origin}/sifre-sifirla/${token}`);
  }

  return { sent: true, email };
}

export type ResetPasswordState = { error: string } | null;

export async function resetPasswordAction(
  token: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (password !== password2) return { error: "Şifreler eşleşmiyor." };

  const tokenHash = hashResetToken(token);
  const record = (await passwordResets.list()).find((r) => r.tokenHash === tokenHash);
  if (!record || record.used || new Date(record.expiresAt) < new Date()) {
    return { error: "Bağlantının süresi dolmuş veya geçersiz. Yeniden sıfırlama isteyin." };
  }

  const passwordHash = await hashPassword(password);
  await users.update(record.userId, { passwordHash });
  await passwordResets.update(record.id, { used: true });

  redirect("/giris?sifirlandi=1");
}

// Müşteri formundan gelen "ilgiliKisiler" JSON string'ini parse eder —
// createParcelAction'daki "urunler" parse deseninin birebir aynısı. Hem ad
// hem telefon hem email boş olan satırlar (kullanıcı boş bir satır bırakıp
// göndermişse) elenir.
function parseIlgiliKisiler(formData: FormData): IlgiliKisi[] {
  let ilgiliKisiler: IlgiliKisi[] = [];
  const raw = String(formData.get("ilgiliKisiler") ?? "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        ilgiliKisiler = parsed
          .filter((k): k is { ad?: unknown; telefon?: unknown; email?: unknown } => !!k && typeof k === "object")
          .map((k) => ({
            ad: k.ad ? String(k.ad).trim() || undefined : undefined,
            telefon: k.telefon ? formatTelefon(String(k.telefon)) || undefined : undefined,
            email: k.email ? String(k.email).trim() || undefined : undefined,
          }))
          .filter((k) => k.ad || k.telefon || k.email);
      }
    } catch {
      ilgiliKisiler = [];
    }
  }
  return ilgiliKisiler;
}

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();
  const ad = String(formData.get("ad") ?? "").trim();
  if (!ad) {
    throw new Error("Müşteri adı zorunlu.");
  }
  const customer = await customers.create({
    ad,
    adres: String(formData.get("adres") ?? "").trim() || undefined,
    ilgiliKisiler: parseIlgiliKisiler(formData),
    sorumluMuhendisId: user.id,
  });

  revalidatePath("/musteriler");
  redirect(`/musteriler?eklendi=${customer.id}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşteriyi düzenleme yetkiniz yok.");
  }

  const ad = String(formData.get("ad") ?? "").trim();
  if (!ad) {
    throw new Error("Müşteri adı zorunlu.");
  }
  await customers.update(customerId, {
    ad,
    adres: String(formData.get("adres") ?? "").trim() || undefined,
    ilgiliKisiler: parseIlgiliKisiler(formData),
  });

  revalidatePath("/musteriler");
  redirect("/musteriler?guncellendi=1");
}

// createParcelAction ve updateParcelAction'ın paylaştığı alanlar — alan
// (dekar) ve sınır bunun dışında, çünkü onlar sadece haritadan gelir ve
// düzenleme akışında değiştirilemez.
function parseParcelCommonFields(formData: FormData) {
  const ad = String(formData.get("ad") ?? "").trim();
  if (!ad) {
    throw new Error("Parsel adı zorunlu.");
  }

  let urunler: ParcelUrun[] = [];
  const urunlerRaw = String(formData.get("urunler") ?? "");
  if (urunlerRaw) {
    try {
      const parsed = JSON.parse(urunlerRaw);
      if (Array.isArray(parsed)) {
        urunler = parsed
          .filter((u): u is { urun: unknown; anac?: unknown } => !!u && typeof u.urun === "string" && u.urun.trim())
          .map((u) => ({
            urun: String(u.urun).trim(),
            anac: u.anac ? String(u.anac).trim() || undefined : undefined,
          }));
      }
    } catch {
      urunler = [];
    }
  }

  const sulamaSekli = String(formData.get("sulamaSekli") ?? "").trim() || undefined;
  const sulamaDetay = String(formData.get("sulamaDetay") ?? "").trim() || undefined;
  let kuyuIds: string[] | undefined;
  const kuyuIdsRaw = String(formData.get("kuyuIds") ?? "").trim();
  if (kuyuIdsRaw) {
    try {
      const parsed = JSON.parse(kuyuIdsRaw);
      if (Array.isArray(parsed)) {
        kuyuIds = parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
        if (kuyuIds.length === 0) kuyuIds = undefined;
      }
    } catch {
      kuyuIds = undefined;
    }
  }
  const siraArasiRaw = String(formData.get("siraArasi") ?? "").trim();
  const siraUzeriRaw = String(formData.get("siraUzeri") ?? "").trim();
  const agacSayisiRaw = String(formData.get("agacSayisi") ?? "").trim();
  const siraArasi = siraArasiRaw ? Number(siraArasiRaw) : undefined;
  const siraUzeri = siraUzeriRaw ? Number(siraUzeriRaw) : undefined;
  const agacSayisi = agacSayisiRaw ? Number(agacSayisiRaw) : undefined;

  return { ad, urunler, sulamaSekli, sulamaDetay, kuyuIds, siraArasi, siraUzeri, agacSayisi };
}

async function requireParcelAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin parsellerine erişim yetkiniz yok.");
  }
  return customer;
}

// Parsel sınırı kaydedildikten SONRA topraq.ai ile otomatik eşleştirmeyi
// dener. Parsel kaydı bu noktada zaten tamamlanmış olmalı — topraq.ai çökük
// olsa, ağ hatası verse ya da eşleşme bulunamasa bile parsel kaydı ASLA
// bozulmamalı, bu yüzden her hata burada yutulur. Dönen boolean sadece
// redirect query param'ına ve oradan kullanıcıya gösterilecek bildirime yansır.
async function topraqEslestirmeyiDene(customerId: string, parcelId: string, sinir: LatLng[]): Promise<boolean> {
  try {
    const eslesme = await parselEslestir(sinir);
    if (!eslesme) {
      await parcels.update(customerId, parcelId, { topraqEslesme: undefined });
      return false;
    }
    await parcels.update(customerId, parcelId, { topraqEslesme: eslesme });
    return true;
  } catch {
    return false;
  }
}

export async function createParcelAction(customerId: string, formData: FormData) {
  const customer = await requireParcelAccess(customerId);

  const common = parseParcelCommonFields(formData);
  const alanDonum = Number(formData.get("alanDonum") ?? 0) || 0;

  let sinir: LatLng[] | undefined;
  const sinirRaw = String(formData.get("sinir") ?? "");
  if (sinirRaw) {
    try {
      const parsed = JSON.parse(sinirRaw);
      if (Array.isArray(parsed) && parsed.length >= 3) sinir = parsed;
    } catch {
      sinir = undefined;
    }
  }

  // Block No — Yaprak Gübreleme Planı'ndaki parsel kimliği, müşteri adının baş
  // harfleri + sıradaki numara olarak otomatik üretilir (bkz. blockNoUret).
  const mevcutParseller = await parcels.list(customerId);
  const blockNo = blockNoUret(customer.ad, mevcutParseller.map((p) => p.blockNo).filter(Boolean));

  const parcel = await parcels.create(customerId, { ...common, alanDonum, sinir, blockNo });

  // Sınır çizilmeden parsel kaydedilebiliyor (bkz. yukarıdaki empty-state) —
  // bu durumda eşleştirme denenmez, query param'a hiç eklenmez (dürüst: "denenmedi").
  const topraqParam =
    sinir && sinir.length >= 3 ? `&topraqEslesti=${(await topraqEslestirmeyiDene(customerId, parcel.id, sinir)) ? 1 : 0}` : "";

  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}?parselEklendi=${parcel.id}${topraqParam}`);
}

export async function updateParcelAction(customerId: string, parcelId: string, formData: FormData) {
  await requireParcelAccess(customerId);

  const existing = await parcels.get(customerId, parcelId);
  if (!existing) {
    throw new Error("Parsel bulunamadı.");
  }

  const common = parseParcelCommonFields(formData);
  // Alan (alanDonum) ve sinir kasıtlı olarak burada yok — haritadan gelir,
  // bu formdan değiştirilemez.
  await parcels.update(customerId, parcelId, common);

  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}?tab=parseller&parselGuncellendi=${parcelId}`);
}

// Parsel Detayı sayfasındaki sınır haritasından gelir — "Devam Et" ile
// yeniden çizilen sınır ve otomatik hesaplanan alanı kaydeder. Diğer parsel
// alanları (ürün, sulama vb.) bu action'ın kapsamı dışında, updateParcelAction
// onları yönetir.
export async function updateParcelSinirAction(
  customerId: string,
  parcelId: string,
  sinir: LatLng[],
  alanDonum: number,
) {
  await requireParcelAccess(customerId);

  const existing = await parcels.get(customerId, parcelId);
  if (!existing) {
    throw new Error("Parsel bulunamadı.");
  }

  await parcels.update(customerId, parcelId, { sinir, alanDonum });

  const topraqEslesti = await topraqEslestirmeyiDene(customerId, parcelId, sinir);

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
  redirect(`/musteriler/${customerId}/parseller/${parcelId}?sinirGuncellendi=1&topraqEslesti=${topraqEslesti ? 1 : 0}`);
}

// Isı Toplamı kartındaki +/- alanından çağrılır — redirect yok, kart anlık
// güncellensin diye yeni değeri geri döner.
export async function updateParcelGddTabanAction(customerId: string, parcelId: string, taban: number): Promise<number> {
  await requireParcelAccess(customerId);

  const existing = await parcels.get(customerId, parcelId);
  if (!existing) {
    throw new Error("Parsel bulunamadı.");
  }

  const guvenliTaban = Number.isFinite(taban) ? Math.min(30, Math.max(0, taban)) : 10;
  await parcels.update(customerId, parcelId, { gddTabanSicaklik: guvenliTaban });

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
  return guvenliTaban;
}

export async function deleteParcelAction(customerId: string, parcelId: string, _formData: FormData) {
  await requireParcelAccess(customerId);
  await parcels.remove(customerId, parcelId);
  revalidatePath(`/musteriler/${customerId}`);
}

export async function createWellAction(customerId: string, formData: FormData) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşteriye kuyu ekleme yetkiniz yok.");
  }

  const ad = String(formData.get("ad") ?? "").trim();
  if (!ad) {
    throw new Error("Kuyu adı zorunlu.");
  }

  const well = await wells.create(customerId, { ad });
  revalidatePath(`/musteriler/${customerId}/parseller/yeni`);
  revalidatePath(`/musteriler/${customerId}`);
  return well;
}

async function requireWellAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin kuyularına erişim yetkiniz yok.");
  }
  return customer;
}

export async function updateWellAction(customerId: string, wellId: string, formData: FormData) {
  await requireWellAccess(customerId);

  const ad = String(formData.get("ad") ?? "").trim();
  if (!ad) {
    throw new Error("Kuyu adı zorunlu.");
  }

  const well = await wells.update(customerId, wellId, { ad });
  if (!well) {
    throw new Error("Kuyu bulunamadı.");
  }

  revalidatePath(`/musteriler/${customerId}`);
  return well;
}

// Kuyu silinince ona atanmış tüm parsellerin kuyuIds listesinden bu kuyu
// çıkarılır — aksi halde parsel kartları/detayı var olmayan bir kuyuya işaret eder.
export async function deleteWellAction(customerId: string, wellId: string, _formData: FormData) {
  await requireWellAccess(customerId);

  const musterininParselleri = await parcels.list(customerId);
  const baglıParseller = musterininParselleri.filter((p) => p.kuyuIds?.includes(wellId));
  for (const parcel of baglıParseller) {
    const kalanlar = (parcel.kuyuIds ?? []).filter((id) => id !== wellId);
    await parcels.update(customerId, parcel.id, { kuyuIds: kalanlar.length ? kalanlar : undefined });
  }

  await wells.remove(customerId, wellId);

  revalidatePath(`/musteriler/${customerId}`);
  revalidatePath(`/musteriler/${customerId}/parseller/${wellId}`);
  for (const parcel of baglıParseller) {
    revalidatePath(`/musteriler/${customerId}/parseller/${parcel.id}`);
  }
}

// Sulama Kuyuları sekmesindeki checkbox listesinden çağrılır — bir parsel
// birden fazla kuyuya atanabilir (many-to-many). atanacak=true ise kuyu
// listeye eklenir, false ise listeden çıkarılır.
export async function assignParcelToWellAction(customerId: string, parcelId: string, wellId: string, atanacak: boolean) {
  await requireWellAccess(customerId);

  const parcel = await parcels.get(customerId, parcelId);
  if (!parcel) {
    throw new Error("Parsel bulunamadı.");
  }

  const well = (await wells.list(customerId)).find((w) => w.id === wellId);
  if (!well) {
    throw new Error("Kuyu bulunamadı.");
  }

  const mevcut = parcel.kuyuIds ?? [];
  const guncel = atanacak ? Array.from(new Set([...mevcut, wellId])) : mevcut.filter((id) => id !== wellId);

  await parcels.update(customerId, parcelId, { kuyuIds: guncel.length ? guncel : undefined });

  revalidatePath(`/musteriler/${customerId}`);
  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
}

async function requireGorevAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin görevlerine erişim yetkiniz yok.");
  }
  return customer;
}

const GECERLI_GOREV_DURUMLARI: GorevDurumu[] = ["bekliyor", "tamamlandi", "iptal"];

export async function createGorevAction(customerId: string, formData: FormData) {
  await requireGorevAccess(customerId);

  const konu = String(formData.get("konu") ?? "").trim();
  if (!konu) {
    throw new Error("Görev konusu zorunlu.");
  }

  const durumRaw = String(formData.get("durum") ?? "bekliyor");
  const durum: GorevDurumu = GECERLI_GOREV_DURUMLARI.includes(durumRaw as GorevDurumu)
    ? (durumRaw as GorevDurumu)
    : "bekliyor";
  const not = String(formData.get("not") ?? "").trim() || undefined;

  const gorev = await gorevler.create(customerId, { konu, durum, not });
  revalidatePath(`/musteriler/${customerId}`);
  return gorev;
}

export async function updateGorevDurumAction(customerId: string, gorevId: string, durum: GorevDurumu) {
  await requireGorevAccess(customerId);

  if (!GECERLI_GOREV_DURUMLARI.includes(durum)) {
    throw new Error("Geçersiz görev durumu.");
  }

  const gorev = await gorevler.update(customerId, gorevId, { durum });
  if (!gorev) {
    throw new Error("Görev bulunamadı.");
  }

  revalidatePath(`/musteriler/${customerId}`);
  return gorev;
}

export async function deleteGorevAction(customerId: string, gorevId: string, _formData: FormData) {
  await requireGorevAccess(customerId);
  await gorevler.remove(customerId, gorevId);
  revalidatePath(`/musteriler/${customerId}`);
}

async function requireRecordAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin saha kayıtlarına erişim yetkiniz yok.");
  }
  return customer;
}

// "valuesJson" — YeniKayitForm'da dinamik alanlardan derlenen JSON string
// (urunler JSON-stringify deseninin aynısı, bkz. ParselEkleWizard). Sadece
// seçilen kayıt tipinin RecordTypeDef.fields'ındaki key'lere izin verilir
// (whitelist) — kullanıcı formData'ya elle başka alan eklese bile values'a
// sızamaz. field.type'a göre tip dönüşümü (Number/String) burada yapılır.
async function parseRecordValues(recordTypeId: string, valuesJson: string): Promise<Record<string, string | number>> {
  const type = (await recordTypes.list()).find((t) => t.id === recordTypeId);
  if (!type) {
    throw new Error("Geçersiz kayıt tipi.");
  }

  let ham: Record<string, unknown> = {};
  if (valuesJson) {
    try {
      const parsed = JSON.parse(valuesJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ham = parsed;
    } catch {
      ham = {};
    }
  }

  const values: Record<string, string | number> = {};
  for (const field of type.fields) {
    const hamDeger = ham[field.key];
    if (hamDeger === undefined || hamDeger === null || hamDeger === "") continue;
    values[field.key] = field.type === "number" ? Number(hamDeger) || 0 : String(hamDeger);
  }

  return values;
}

export async function createRecordAction(customerId: string, parcelId: string, formData: FormData) {
  await requireRecordAccess(customerId);
  const user = await requireUser();

  const parcel = await parcels.get(customerId, parcelId);
  if (!parcel) {
    throw new Error("Parsel bulunamadı.");
  }

  const recordTypeId = String(formData.get("recordTypeId") ?? "");
  const tarih = String(formData.get("tarih") ?? "").trim();
  if (!recordTypeId || !tarih) {
    throw new Error("Kayıt tipi ve tarih zorunlu.");
  }
  const not = String(formData.get("not") ?? "").trim() || undefined;
  const values = await parseRecordValues(recordTypeId, String(formData.get("valuesJson") ?? ""));

  await records.create(customerId, parcelId, { recordTypeId, tarih, muhendisId: user.id, values, not });

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
  revalidatePath("/kayitlar");
  redirect(`/musteriler/${customerId}/parseller/${parcelId}`);
}

export async function deleteRecordAction(customerId: string, parcelId: string, recordId: string, _formData: FormData) {
  await requireRecordAccess(customerId);
  await records.remove(customerId, recordId);
  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
  revalidatePath("/kayitlar");
}

// Ziyaret Kaydı sekmesinin fotoğraf alanından gelen dosyaları
// public/uploads/ziyaret-kaydi/<visitId>/ altına yazar. Bir ziyaretteki TÜM
// seçili parseller için oluşturulan kayıtlar aynı visitId'yi (dolayısıyla
// aynı gorseller listesini) paylaşır — dosyalar burada bir kez yazılır.
// Dosya adı asla kullanıcıdan gelen orijinal ada güvenilerek üretilmez;
// crypto.randomUUID() + orijinal uzantı kullanılır. Sadece image/* MIME
// tipi kabul edilir (güvenlik — sunucu tarafında da kontrol edilir).
async function ziyaretFotograflariniKaydet(formData: FormData): Promise<string[]> {
  const dosyalar = formData.getAll("fotograflar").filter((f): f is File => f instanceof File && f.size > 0);
  if (dosyalar.length === 0) return [];

  const gorselDosyalar = dosyalar.filter((f) => f.type.startsWith("image/"));
  if (gorselDosyalar.length === 0) return [];

  const visitId = randomUUID();
  const hedefKlasor = path.join(process.cwd(), "public", "uploads", "ziyaret-kaydi", visitId);
  await mkdir(hedefKlasor, { recursive: true });

  const yollar: string[] = [];
  for (const dosya of gorselDosyalar) {
    const orijinalUzanti = dosya.name.includes(".") ? dosya.name.slice(dosya.name.lastIndexOf(".")) : "";
    const guvenliUzanti = /^\.[a-zA-Z0-9]{1,5}$/.test(orijinalUzanti) ? orijinalUzanti : "";
    const dosyaAdi = `${randomUUID()}${guvenliUzanti}`;
    const buffer = Buffer.from(await dosya.arrayBuffer());
    await writeFile(path.join(hedefKlasor, dosyaAdi), buffer);
    yollar.push(`/uploads/ziyaret-kaydi/${visitId}/${dosyaAdi}`);
  }
  return yollar;
}

// Ziyaret Kaydı sekmesi — parsel-takip'teki (orijinal proje) "Haftalık
// Rapor" hızlı saha ziyareti formunun sadeleştirilmiş, yeniden adlandırılmış
// hali: gün + parsel(ler) seçilir, girilen değerler MEVCUT Kayıtlar
// (FieldRecord) koleksiyonuna, sabit kayıt tiplerini (İlaçlama/Gözlem)
// kullanarak yazılır — orijinaldeki ayrı "Report" varlığı ve haftalık rapor
// birleştirme mantığı burada YOK (bilinçli sadeleştirme). createGorevAction
// gibi redirect yok — çağıran taraf (CustomerDetailTabs) kendi
// router.refresh()'ini yapar.
export async function createZiyaretKaydiAction(customerId: string, formData: FormData) {
  await requireRecordAccess(customerId);
  const user = await requireUser();

  const parcelIds = formData.getAll("parcelIds").map(String);
  const tarih = String(formData.get("tarih") ?? "").trim();
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const recete = String(formData.get("recete") ?? "").trim();
  const fenolojikDonem = String(formData.get("fenolojikDonem") ?? "").trim();
  const durum = String(formData.get("durum") ?? "").trim();
  const oncelikPuaniHam = String(formData.get("oncelikPuani") ?? "").trim();
  const oncelikPuani = oncelikPuaniHam ? Number(oncelikPuaniHam) : undefined;

  if (parcelIds.length === 0 || !tarih) {
    throw new Error("En az bir parsel ve tarih zorunludur.");
  }

  // Seçilen parsellerin gerçekten bu müşteriye ait olduğunu doğrula —
  // formData'daki parcelIds elle değiştirilse bile başka müşterinin
  // parseline kayıt yazılamaz.
  for (const parcelId of parcelIds) {
    const parcel = await parcels.get(customerId, parcelId);
    if (!parcel) {
      throw new Error("Seçilen parsellerden biri bu müşteriye ait değil.");
    }
  }

  const gorseller = await ziyaretFotograflariniKaydet(formData);

  const tipler = await recordTypes.list();
  const ilacTuru = tipler.find((t) => t.ad === "İlaçlama");
  const gozlemTuru = tipler.find((t) => t.ad === "Gözlem");
  if (!gozlemTuru || (recete && !ilacTuru)) {
    throw new Error("Kayıt tipi bulunamadı — Ayarlar'ı kontrol edin.");
  }

  for (const parcelId of parcelIds) {
    const ortakAlanlar = {
      tarih,
      not: aciklama || undefined,
      fenolojikDonem: fenolojikDonem || undefined,
      durum: durum || undefined,
      oncelikPuani,
      gorseller: gorseller.length ? gorseller : undefined,
    };

    // Seçili GÜN için bu parselde zaten var olan aynı tip kaydı bulur — varsa
    // günceller, yoksa yeni kayıt oluşturur (aynı gün için tekrar ziyaret
    // kaydı girilirse satır çoğalmasın diye).
    const mevcutKayitlar = await records.list(customerId, parcelId);
    const mevcutKaydiBul = (recordTypeId: string) =>
      mevcutKayitlar.find((r) => r.recordTypeId === recordTypeId && r.tarih === tarih);

    let herhangiBirTipYazildi = false;

    if (recete && ilacTuru) {
      const mevcut = mevcutKaydiBul(ilacTuru.id);
      const values = { recete };
      if (mevcut) await records.update(customerId, parcelId, mevcut.id, { ...ortakAlanlar, values });
      else await records.create(customerId, parcelId, { recordTypeId: ilacTuru.id, muhendisId: user.id, values, ...ortakAlanlar });
      herhangiBirTipYazildi = true;
    }

    // Hiçbir uygulama girilmemişse (sadece açıklama/fotoğraf varsa) düz bir
    // Gözlem kaydı oluştur/güncelle — ziyaret sessizce kaybolmasın.
    if (!herhangiBirTipYazildi) {
      const mevcut = mevcutKaydiBul(gozlemTuru.id);
      if (mevcut) await records.update(customerId, parcelId, mevcut.id, { ...ortakAlanlar, values: mevcut.values });
      else
        await records.create(customerId, parcelId, {
          recordTypeId: gozlemTuru.id,
          muhendisId: user.id,
          values: {},
          ...ortakAlanlar,
        });
    }

    revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
  }

  revalidatePath(`/musteriler/${customerId}`);
  revalidatePath("/kayitlar");
}

async function requireBeslenmeAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin beslenme planlarına erişim yetkiniz yok.");
  }
  return customer;
}

function parseBeslenmePlaniFields(formData: FormData) {
  return {
    sezon: String(formData.get("sezon") ?? "").trim(),
    hedefAzotKgHa: Number(formData.get("hedefAzotKgHa") ?? 0) || 0,
    hedefN: Number(formData.get("hedefN") ?? 100) || 100,
    hedefP: Number(formData.get("hedefP") ?? 0) || 0,
    hedefK: Number(formData.get("hedefK") ?? 0) || 0,
    agacSayisiHa: Number(formData.get("agacSayisiHa") ?? 0) || 0,
    not: String(formData.get("not") ?? "").trim() || undefined,
  };
}

export async function createBeslenmePlaniAction(customerId: string, parcelId: string, formData: FormData) {
  await requireBeslenmeAccess(customerId);

  await beslenmePlanlari.create(customerId, parcelId, parseBeslenmePlaniFields(formData));

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
}

export async function updateBeslenmePlaniAction(
  customerId: string,
  parcelId: string,
  planId: string,
  formData: FormData,
) {
  await requireBeslenmeAccess(customerId);

  const plan = await beslenmePlanlari.update(customerId, parcelId, planId, parseBeslenmePlaniFields(formData));
  if (!plan) {
    throw new Error("Beslenme planı bulunamadı.");
  }

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
  redirect(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
}

// Planı ve ona bağlı TÜM gerçekleşen uygulama kayıtlarını siler (cascade) —
// aksi halde yetim uygulama kayıtları veride kalır.
export async function deleteBeslenmePlaniAction(
  customerId: string,
  parcelId: string,
  planId: string,
  _formData: FormData,
) {
  await requireBeslenmeAccess(customerId);

  const uygulamalar = await beslenmeUygulamalari.list(customerId, parcelId);
  for (const uygulama of uygulamalar.filter((u) => u.planId === planId)) {
    await beslenmeUygulamalari.remove(customerId, parcelId, uygulama.id);
  }
  await beslenmePlanlari.remove(customerId, parcelId, planId);

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
  revalidatePath(`/musteriler/${customerId}`);
}

export async function createBeslenmeUygulamaAction(
  customerId: string,
  parcelId: string,
  planId: string,
  formData: FormData,
) {
  await requireBeslenmeAccess(customerId);

  const tarih = String(formData.get("tarih") ?? "").trim();
  const urun = String(formData.get("urun") ?? "") as BeslenmeUrun;
  if (!tarih || !urun) {
    throw new Error("Tarih ve ürün zorunlu.");
  }
  const miktarKg = Number(formData.get("miktarKg") ?? 0) || 0;
  const not = String(formData.get("not") ?? "").trim() || undefined;

  await beslenmeUygulamalari.create(customerId, parcelId, planId, { tarih, urun, miktarKg, not });

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
  redirect(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
}

export async function deleteBeslenmeUygulamaAction(
  customerId: string,
  parcelId: string,
  uygulamaId: string,
  _formData: FormData,
) {
  await requireBeslenmeAccess(customerId);
  await beslenmeUygulamalari.remove(customerId, parcelId, uygulamaId);
  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/beslenme`);
}

async function requireFertigasyonAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin fertigasyon kayıtlarına erişim yetkiniz yok.");
  }
  return customer;
}

export async function createFertigasyonKaydiAction(customerId: string, parcelId: string, formData: FormData) {
  await requireFertigasyonAccess(customerId);

  const tarih = String(formData.get("tarih") ?? "").trim();
  const urun = String(formData.get("urun") ?? "AS21") as FertigasyonUrun;
  if (!tarih || !urun) {
    throw new Error("Tarih ve ürün zorunlu.");
  }
  const vanaAdi = String(formData.get("vanaAdi") ?? "").trim() || undefined;
  const suTonajiRaw = String(formData.get("suTonaji") ?? "").trim();
  const suTonaji = suTonajiRaw === "" ? undefined : Number(suTonajiRaw);
  const agacSayisi = Number(formData.get("agacSayisi") ?? 0) || 0;
  const dozAgac = Number(formData.get("dozAgac") ?? 0) || 0;
  const ambalajBoyutu = Number(formData.get("ambalajBoyutu") ?? 1) || 1;
  const not = String(formData.get("not") ?? "").trim() || undefined;

  await fertigasyonKayitlari.create(customerId, parcelId, {
    tarih,
    urun,
    vanaAdi,
    suTonaji,
    agacSayisi,
    dozAgac,
    ambalajBoyutu,
    not,
  });

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/fertigasyon`);
  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}/parseller/${parcelId}/fertigasyon`);
}

export async function deleteFertigasyonKaydiAction(
  customerId: string,
  parcelId: string,
  kayitId: string,
  _formData: FormData,
) {
  await requireFertigasyonAccess(customerId);
  await fertigasyonKayitlari.remove(customerId, parcelId, kayitId);
  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/fertigasyon`);
  revalidatePath(`/musteriler/${customerId}`);
}

async function requireYaprakGubrelemePlaniAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin yaprak gübreleme planına erişim yetkiniz yok.");
  }
  return customer;
}

// "degerlerJson" — YaprakGubrelemePlaniView'deki tüm sayısal hücrelerden
// derlenen `{ "donemIndex:urunIndex:kolonIndex": deger }` JSON string'i
// (ygpAnahtar ile üretilir). Sadece sayıya çevrilebilen ve boş olmayan
// hücreler kaydedilir — boş bırakılan hücreler degerler map'ine hiç girmez.
export async function saveYaprakGubrelemePlaniAction(customerId: string, parcelId: string, formData: FormData) {
  await requireYaprakGubrelemePlaniAccess(customerId);

  const yil = Number(formData.get("yil") ?? 0);
  if (!yil) {
    throw new Error("Yıl zorunlu.");
  }

  let degerler: Record<string, number> = {};
  const degerlerRaw = String(formData.get("degerlerJson") ?? "");
  if (degerlerRaw) {
    try {
      const parsed = JSON.parse(degerlerRaw);
      if (parsed && typeof parsed === "object") {
        for (const [anahtar, deger] of Object.entries(parsed)) {
          const num = Number(deger);
          if (Number.isFinite(num)) degerler[anahtar] = num;
        }
      }
    } catch {
      degerler = {};
    }
  }

  await yaprakGubrelemePlanlari.kaydet(customerId, parcelId, yil, degerler);

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/yaprak-gubreleme-plani`);
  revalidatePath(`/musteriler/${customerId}`);
}

async function requireSulamaUyumuAccess(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşterinin sulama planlarına erişim yetkiniz yok.");
  }
  return customer;
}

export async function createSulamaPlaniAction(customerId: string, parcelId: string, formData: FormData) {
  await requireSulamaUyumuAccess(customerId);

  const donemBaslangic = String(formData.get("donemBaslangic") ?? "");
  const donemBitis = String(formData.get("donemBitis") ?? "");
  const araGun = Number(formData.get("araGun") ?? 3);
  const gundeKacDefaHam = String(formData.get("gundeKacDefa") ?? "").trim();
  const gundeKacSaatHam = String(formData.get("gundeKacSaat") ?? "").trim();
  const gundeKacDefa = gundeKacDefaHam ? Math.max(1, Number(gundeKacDefaHam)) : null;
  const gundeKacSaat = gundeKacSaatHam ? Math.max(0, Number(gundeKacSaatHam)) : null;

  const tarihler: string[] = [];
  const cursor = new Date(donemBaslangic + "T00:00:00Z");
  const bitis = new Date(donemBitis + "T00:00:00Z");
  while (cursor <= bitis) {
    tarihler.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + Math.max(1, araGun));
  }

  await sulamaPlanlari.create(customerId, parcelId, {
    donemBaslangic,
    donemBitis,
    planlananTarihler: tarihler,
    gundeKacDefa,
    gundeKacSaat,
  });

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/sulama-uyumu`);
  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}/parseller/${parcelId}/sulama-uyumu`);
}

export async function deleteSulamaPlaniAction(
  customerId: string,
  parcelId: string,
  planId: string,
  _formData: FormData,
) {
  await requireSulamaUyumuAccess(customerId);
  await sulamaPlanlari.remove(customerId, parcelId, planId);
  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}/sulama-uyumu`);
  revalidatePath(`/musteriler/${customerId}`);
}

export async function removeCustomerAction(customerId: string) {
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === customerId);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) {
    throw new Error("Bu müşteriyi silme yetkiniz yok.");
  }

  await customers.remove(customerId);

  revalidatePath("/musteriler");
  redirect("/musteriler?silindi=1");
}

// --- Genel Değerlendirme soruları (Ayarlar, sadece yönetici) -------------

async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "admin") {
    throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  }
  return user;
}

function degerlendirmeSorusuFormdanOku(formData: FormData) {
  const soru = String(formData.get("soru") ?? "").trim();
  if (!soru) throw new Error("Soru metni zorunlu.");

  const tipRaw = String(formData.get("tip") ?? "puan");
  const tip: DegerlendirmeSoruTipi = tipRaw === "secmeli" || tipRaw === "metin" ? tipRaw : "puan";

  let secenekler: string[] | undefined;
  if (tip === "secmeli") {
    secenekler = Array.from(
      new Set(
        String(formData.get("secenekler") ?? "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    );
    if (secenekler.length < 2) throw new Error("Seçmeli soru için en az 2 seçenek girin.");
  }

  const parselMod = String(formData.get("parselMod") ?? "tumu");
  const parselIds =
    parselMod === "secili" ? formData.getAll("parselIds").map(String).filter(Boolean) : undefined;
  if (parselMod === "secili" && (!parselIds || parselIds.length === 0)) {
    throw new Error("En az bir parsel seçin veya \"Tüm parseller\"i işaretleyin.");
  }

  return { soru, tip, secenekler, parselIds };
}

export async function createDegerlendirmeSorusuAction(formData: FormData) {
  await requireAdmin();
  await degerlendirmeSorulari.create(degerlendirmeSorusuFormdanOku(formData));
  revalidatePath("/ayarlar/genel-degerlendirme");
}

export async function updateDegerlendirmeSorusuAction(soruId: string, formData: FormData) {
  await requireAdmin();
  await degerlendirmeSorulari.update(soruId, degerlendirmeSorusuFormdanOku(formData));
  revalidatePath("/ayarlar/genel-degerlendirme");
}

export async function deleteDegerlendirmeSorusuAction(soruId: string, _formData: FormData) {
  await requireAdmin();
  await degerlendirmeSorulari.remove(soruId);
  revalidatePath("/ayarlar/genel-degerlendirme");
}

// --- Hastalık/Zararlı Listesi (Ayarlar, sadece yönetici) ------------------

export async function createHastalikTanimiAction(formData: FormData) {
  await requireAdmin();

  const ad = String(formData.get("ad") ?? "").trim();
  if (!ad) throw new Error("Hastalık/zararlı adı zorunlu.");

  await hastalikTanimlari.create(ad);
  revalidatePath("/ayarlar");
}

export async function deleteHastalikTanimiAction(id: string, _formData: FormData) {
  await requireAdmin();
  await hastalikTanimlari.remove(id);
  revalidatePath("/ayarlar");
}

// --- Parsel Genel Değerlendirmesi (yılda bir) -----------------------------

export async function saveParselDegerlendirmeAction(
  customerId: string,
  parcelId: string,
  yil: string,
  formData: FormData,
) {
  await requireParcelAccess(customerId);

  const sorular = (await degerlendirmeSorulari.list()).filter((s) => soruParselIcinGecerli(s, parcelId));
  const cevaplar: ParselDegerlendirmesi["cevaplar"] = [];
  for (const s of sorular) {
    const tip = soruTipi(s);
    if (tip === "secmeli") {
      const secim = String(formData.get(`secim_${s.id}`) ?? "");
      if (!secim || !s.secenekler?.includes(secim)) continue;
      cevaplar.push({ soruId: s.id, puan: 0, secim });
    } else if (tip === "metin") {
      const metin = String(formData.get(`metin_${s.id}`) ?? "").trim();
      if (!metin) continue;
      cevaplar.push({ soruId: s.id, puan: 0, metin });
    } else {
      const puan = Number(formData.get(`puan_${s.id}`) ?? 0);
      if (!puan) continue;
      const not = String(formData.get(`not_${s.id}`) ?? "").trim() || undefined;
      cevaplar.push({ soruId: s.id, puan, not });
    }
  }

  await parselDegerlendirmeleri.kaydet(customerId, parcelId, yil, cevaplar);

  revalidatePath(`/musteriler/${customerId}/parseller/${parcelId}`);
}

// --- Gelir Gider (genel işletme gelir/gider takibi, müşteri/parsele bağlı DEĞİL) ---

// ziyaretFotograflariniKaydet ile AYNI mantığın gelir-gider fişleri için
// bağımsız bir kopyası — public/uploads/gelir-gider/<kayitId>/ altına yazar.
// Kod tekrarı kasıtlı (bkz. görev tanımı) — mevcut fonksiyon değiştirilmedi.
async function gelirGiderFisleriniKaydet(formData: FormData, kayitId: string): Promise<string[]> {
  const dosyalar = formData.getAll("fisler").filter((f): f is File => f instanceof File && f.size > 0);
  if (dosyalar.length === 0) return [];

  const gorselDosyalar = dosyalar.filter((f) => f.type.startsWith("image/"));
  if (gorselDosyalar.length === 0) return [];

  const hedefKlasor = path.join(process.cwd(), "public", "uploads", "gelir-gider", kayitId);
  await mkdir(hedefKlasor, { recursive: true });

  const yollar: string[] = [];
  for (const dosya of gorselDosyalar) {
    const orijinalUzanti = dosya.name.includes(".") ? dosya.name.slice(dosya.name.lastIndexOf(".")) : "";
    const guvenliUzanti = /^\.[a-zA-Z0-9]{1,5}$/.test(orijinalUzanti) ? orijinalUzanti : "";
    const dosyaAdi = `${randomUUID()}${guvenliUzanti}`;
    const buffer = Buffer.from(await dosya.arrayBuffer());
    await writeFile(path.join(hedefKlasor, dosyaAdi), buffer);
    yollar.push(`/uploads/gelir-gider/${kayitId}/${dosyaAdi}`);
  }
  return yollar;
}

const GECERLI_GELIR_GIDER_TURLERI: GelirGiderTur[] = ["gelir", "gider"];

export async function createGelirGiderKaydiAction(formData: FormData) {
  const user = await requireUser();

  const turRaw = String(formData.get("tur") ?? "");
  const tur: GelirGiderTur = GECERLI_GELIR_GIDER_TURLERI.includes(turRaw as GelirGiderTur)
    ? (turRaw as GelirGiderTur)
    : "gider";

  const tarih = String(formData.get("tarih") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "").trim();
  if (!tarih || !kategori) {
    throw new Error("Tarih ve kategori zorunlu.");
  }

  // Gelir hep pozitif tutulur; gider iade/alacak kaydı için negatif girilebilir
  // (ör. iade alınan bir masraf) — negatifi burada pozitife çevirmek o bilgiyi kaybeder.
  const tutarHam = Number(formData.get("tutar") ?? 0) || 0;
  const tutar = tur === "gelir" ? Math.abs(tutarHam) : tutarHam;
  const aciklama = String(formData.get("aciklama") ?? "").trim() || undefined;
  const customerId = String(formData.get("customerId") ?? "").trim() || undefined;

  // Dosyalar yazılmadan önce kayıt id'si üretilir — ziyaretFotograflariniKaydet'teki
  // visitId mantığının aynısı, burada kayıt id'siyle birebir eşleşsin diye.
  const kayitId = randomUUID();
  const fisler = await gelirGiderFisleriniKaydet(formData, kayitId);

  await gelirGiderKayitlari.create({
    tur,
    tarih,
    tutar,
    kategori,
    aciklama,
    customerId,
    fisler: fisler.length ? fisler : undefined,
    muhendisId: user.id,
  });

  revalidatePath("/gelir-gider");
  redirect("/gelir-gider");
}

export async function deleteGelirGiderKaydiAction(id: string, _formData: FormData) {
  await requireUser();
  await gelirGiderKayitlari.remove(id);
  revalidatePath("/gelir-gider");
}

// Kullanıcı yönetimi — sadece yönetici. Sayfa seviyesindeki notFound() koruması
// dışında burada da ayrıca rol kontrolü yapılıyor; Server Action'lar doğrudan
// çağrılabildiği için sayfa koruması tek başına yeterli değil.
export type UserFormState = { error: string } | null;

export async function createUserAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();

  const ad = String(formData.get("ad") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "muhendis") === "admin" ? "admin" : "muhendis";

  if (!ad || !email || !password) return { error: "Ad, e-posta ve şifre zorunlu." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const existing = (await users.list()).find((u) => u.email.toLowerCase() === email);
  if (existing) return { error: "Bu e-posta ile zaten bir kullanıcı var." };

  const passwordHash = await hashPassword(password);
  await users.create({ ad, email, passwordHash, rol });

  revalidatePath("/kullanicilar");
  return null;
}

export async function updateUserAction(id: string, _prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();

  const ad = String(formData.get("ad") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rol = String(formData.get("rol") ?? "muhendis") === "admin" ? "admin" : "muhendis";
  const password = String(formData.get("password") ?? "");

  if (!ad || !email) return { error: "Ad ve e-posta zorunlu." };
  if (password && password.length < 8) return { error: "Yeni şifre en az 8 karakter olmalı." };

  const all = await users.list();
  const target = all.find((u) => u.id === id);
  if (!target) return { error: "Kullanıcı bulunamadı." };

  const emailTaken = all.some((u) => u.id !== id && u.email.toLowerCase() === email);
  if (emailTaken) return { error: "Bu e-posta başka bir kullanıcıda kayıtlı." };

  // Son yöneticiyi kazara mühendisliğe düşürüp herkesi kilitli bırakmayı engelle.
  if (target.rol === "admin" && rol !== "admin") {
    const digerYoneticiSayisi = all.filter((u) => u.rol === "admin" && u.id !== id).length;
    if (digerYoneticiSayisi === 0) return { error: "Son yönetici hesabının rolü değiştirilemez." };
  }

  const patch: Partial<User> = { ad, email, rol };
  if (password) patch.passwordHash = await hashPassword(password);
  await users.update(id, patch);

  revalidatePath("/kullanicilar");
  return null;
}

export async function deleteUserAction(id: string, _formData: FormData) {
  const me = await requireAdmin();
  if (id === me.id) throw new Error("Kendi hesabınızı silemezsiniz.");

  const all = await users.list();
  const target = all.find((u) => u.id === id);
  if (!target) return;

  if (target.rol === "admin") {
    const digerYoneticiSayisi = all.filter((u) => u.rol === "admin" && u.id !== id).length;
    if (digerYoneticiSayisi === 0) throw new Error("Son yönetici hesabı silinemez.");
  }

  await users.delete(id);
  revalidatePath("/kullanicilar");
}
