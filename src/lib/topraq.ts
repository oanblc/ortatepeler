import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon as turfPolygon } from "@turf/helpers";
import type { LatLng, TopraqEslesme, ToprakNemGunlukOzet, HavaGunlukOzet } from "@/types";

// agro.topraq.ai müşteri panelinden hava istasyonu (sıcaklık/bağıl nem),
// toprak nem sensörü (kök bölgesi nem indeksi) verisini çeken VE parsel
// sınırını topraq.ai'deki gerçek alan çizimleriyle otomatik eşleştiren
// entegrasyon. Resmi/açık bir API değil — topraq.ai web arayüzünün kullandığı
// dahili API, sadece bu hesabın (TOPRAQ_USERNAME) erişebildiği çiftlikleri
// okur. Bu dosya ~/Developer/parsel-takip'teki src/lib/topraq.ts'in bire bir
// portu + yeni parselEslestir/nemGunlukOzet/istasyonGunlukOzet fonksiyonları.
// Kalıcı depolama yok: her seferinde canlı çekilir; sadece eşleştirme SONUCU
// (Parcel.topraqEslesme) parsel kaydında saklanır.

const BASE_URL = "https://agro.topraq.ai/api/v33/";
const HEADERS_BASE = {
  "Content-Type": "application/json",
  "X-APP-NAME": "customer",
  "X-APP-ENV": "production",
  Accept: "application/json",
  "x-version": "1.0",
};

type TopraqSession = { access_token: string; refresh_token: string; token_type: string };

export type TopraqCustomer = { id: number; full_name: string };

export type TopraqIstasyon = {
  deviceId: number;
  label: string;
  fieldId: number;
  fieldName: string;
  sicaklik?: number;
  bagilNem?: number;
  sonGuncelleme?: string;
};

export type TopraqNemSensoru = {
  deviceId: number;
  label: string;
  fieldId?: number;
  fieldName?: string;
  deger?: number;
  degerMetni?: string;
  sonGuncelleme?: string;
};

export type TopraqOverview = {
  istasyonlar: TopraqIstasyon[];
  nemSensorleri: TopraqNemSensoru[];
};

// Ağırlıklı Kök Bölgesi Nem İndeksi — 2 saatlik bir nokta. Aynı günün 20/40/
// 60/80cm ağırlıkları (o günkü fark yüzdesi) bu noktaya da uygulanır.
export type TopraqNemNoktasi = {
  t: string; // "YYYY-MM-DDTHH:mm"
  v20: number;
  v40: number;
  v60: number;
  v80: number;
  debi: number;
  w20: number;
  w40: number;
  w60: number;
  w80: number;
  weighted: number;
};

export type TopraqNemGunu = {
  date: string; // dd.MM.yyyy
  r20: number;
  r40: number;
  r60: number;
  r80: number;
  w20: number;
  w40: number;
  w60: number;
  w80: number;
  sulama: boolean;
};

export type TopraqNemProfili = {
  fieldName: string;
  deviceLabel: string;
  buckets: TopraqNemNoktasi[];
  gunler: TopraqNemGunu[];
};

// Bir çiftlikteki cihaz — hem sulama/basınç sensörleri hem toprak nemi
// sensörleri "irrigation" tipiyle geliyor (topraq.ai'nin harita ikonu
// kategorisi, ölçüm tipiyle birebir örtüşmüyor); hava istasyonları "weather".
type AgroDevice = {
  id: number;
  type: string;
  label: string;
  field?: { id: number; name: string; center?: { latitude: number; longitude: number } };
  location?: { latitude: number; longitude: number };
};

// topraq.ai haritasında elle çizilmiş alan poligonu — bizim çizdiğimiz parsel
// sınırından bağımsız, kendi field id'si YOK (sadece koordinat listesi).
type AgroParcel = { coordinates?: { latitude: number; longitude: number }[] };

// Kök oturum (customer seçilmeden önceki) — çiftlik listesini almak için.
let rootSession: TopraqSession | null = null;
// Her çiftlik (customer id) için ayrı token — account/change-customer, cid'i
// token içine gömüyor, bu yüzden çiftlik başına ayrı bir oturum lazım.
const customerSessions = new Map<number, TopraqSession>();

async function apiPost(path: string, session: TopraqSession | null, body: unknown, params?: Record<string, string | number>) {
  const url = new URL(BASE_URL + path);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method: "POST",
    headers: session ? { ...HEADERS_BASE, Authorization: `${session.token_type} ${session.access_token}` } : HEADERS_BASE,
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`topraq POST ${path} -> ${res.status}`);
  return res.json();
}

async function apiGet(path: string, session: TopraqSession) {
  const res = await fetch(BASE_URL + path, {
    headers: { ...HEADERS_BASE, Authorization: `${session.token_type} ${session.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`topraq GET ${path} -> ${res.status}`);
  return res.json();
}

function credentials() {
  const user_name = process.env.TOPRAQ_USERNAME;
  const password = process.env.TOPRAQ_PASSWORD;
  if (!user_name || !password) return null;
  return { user_name, password };
}

async function login(): Promise<TopraqSession> {
  const creds = credentials();
  if (!creds) throw new Error("TOPRAQ_USERNAME / TOPRAQ_PASSWORD tanımlı değil.");
  const body = await apiPost("account/token", null, { ...creds, remember: false, grant_type: "access_token" });
  if (!body?.data?.access_token) throw new Error("Topraq girişi başarısız.");
  rootSession = body.data;
  return body.data;
}

async function getRootSession(): Promise<TopraqSession> {
  if (rootSession) return rootSession;
  return login();
}

async function switchCustomer(customerId: number): Promise<TopraqSession> {
  const cached = customerSessions.get(customerId);
  if (cached) return cached;
  const root = await getRootSession();
  const body = await apiPost("account/change-customer", root, { customer: customerId });
  if (!body?.data?.access_token) throw new Error("Çiftlik seçilemedi.");
  customerSessions.set(customerId, body.data);
  return body.data;
}

export async function topraqCiftlikleriGetir(): Promise<TopraqCustomer[]> {
  const session = await getRootSession();
  const body = await apiGet("account/change-customer", session);
  return body?.view?.select_lists?.customers ?? [];
}

// Tarla (field) -> cihaz envanteri + haritada elle çizilmiş alan poligonları.
async function agroMapData(session: TopraqSession): Promise<{ devices: AgroDevice[]; parcels: AgroParcel[] }> {
  const body = await apiGet("agro-map/data?base_href=/customer/", session);
  return {
    devices: (body?.data?.data?.devices ?? []) as AgroDevice[],
    parcels: (body?.data?.data?.parcels ?? []) as AgroParcel[],
  };
}

// O çiftlikte canlı toprak nemi ölçümü olan cihaz id'leri — field.center yakınlık
// eşleşmesinde bulunan cihazın "gerçekten bir nem sensörü mü" olduğunu doğrulamak için.
// agro-map/measurement/0/data hem "Kök Bölgesi Nem İndeksi" (gerçek toprak nemi
// sensörü) hem sulama hattı basınç okumalarını (bar) aynı listede döndürüyor —
// `name` alanına göre filtrelenmezse basınç sensörleri yanlışlıkla nem sensörü
// sanılır (field/{id}/device/{id}/measurement/167/data o cihaz için boş döner).
async function moistureDeviceIds(session: TopraqSession): Promise<Set<number>> {
  const body = await apiGet("agro-map/measurement/0/data", session);
  const rows = (body?.data ?? []) as Array<{ device_id: number; name?: string }>;
  return new Set(rows.filter((r) => r.name === "Kök Bölgesi Nem İndeksi").map((r) => r.device_id));
}

async function haftaIstasyonVerisi(session: TopraqSession, fieldId: number): Promise<TopraqIstasyon[]> {
  const criteria = (await apiPost("report/weather/criterias", session, { field_id: fieldId }))?.data;
  if (!criteria) return [];
  const data = (await apiPost("report/weather/data", session, criteria))?.data as
    | Array<{ field: { id: number; name: string }; device: { id: number; label: string }; data: Array<{ title?: string; series: Array<{ title: string; data: Array<{ x_f: string; y: number }> }> }> }>
    | undefined;
  if (!data) return [];

  // Aynı cihaz (device_id) API yanıtında birden fazla kez geçebiliyor —
  // her metrik grubu (Sıcaklık&Radyasyon, Bağıl Nem&Yağış ...) ayrı bir
  // "entry" olarak dönüyor ve bazı gruplar sıcaklığı tekrar içeriyor.
  // Bu yüzden cihaz bazında birleştiriyoruz (aksi halde tekrarlanan satır
  // / React key çakışması olur).
  const cihazBazinda = new Map<number, TopraqIstasyon>();
  for (const entry of data) {
    const mevcut = cihazBazinda.get(entry.device.id) ?? {
      deviceId: entry.device.id,
      label: entry.device.label,
      fieldId: entry.field.id,
      fieldName: entry.field.name,
    };
    for (const grup of entry.data ?? []) {
      for (const seri of grup.series ?? []) {
        const son = seri.data?.[seri.data.length - 1];
        if (!son) continue;
        if (seri.title === "Hava Sıcaklığı") mevcut.sicaklik = son.y;
        if (seri.title === "Bağıl Nem") mevcut.bagilNem = son.y;
        if (son.x_f) mevcut.sonGuncelleme = son.x_f;
      }
    }
    cihazBazinda.set(entry.device.id, mevcut);
  }
  return Array.from(cihazBazinda.values()).filter((i) => i.sicaklik !== undefined || i.bagilNem !== undefined);
}

export async function getTopraqOverview(customerId: number): Promise<TopraqOverview> {
  const session = await switchCustomer(customerId);
  const [{ devices }, moisture] = await Promise.all([
    agroMapData(session),
    apiGet("agro-map/measurement/0/data", session).then((b) => b?.data ?? []),
  ]);

  const deviceById = new Map(devices.map((d) => [d.id, d]));

  // Hava istasyonu bulunan tarlaları tekilleştir (bir tarlada birden fazla
  // istasyon olabilir, report/weather/data zaten hepsini tek çağrıda döner).
  const istasyonluAlanlar = new Set(devices.filter((d) => d.type === "weather").map((d) => d.field?.id).filter((id): id is number => id !== undefined));

  const istasyonSonuclari = await Promise.all(
    Array.from(istasyonluAlanlar).map((fieldId) => haftaIstasyonVerisi(session, fieldId).catch(() => [])),
  );
  const istasyonlar = istasyonSonuclari.flat().sort((a, b) => a.fieldName.localeCompare(b.fieldName, "tr"));

  type MoistureRow = { device_id: number; value: number | null; value_f?: string; data_at_f?: string };
  const nemSensorleri: TopraqNemSensoru[] = (moisture as MoistureRow[])
    .map((m) => {
      const cihaz = deviceById.get(m.device_id);
      return {
        deviceId: m.device_id,
        label: cihaz?.label ?? `Cihaz #${m.device_id}`,
        fieldId: cihaz?.field?.id,
        fieldName: cihaz?.field?.name,
        deger: m.value ?? undefined,
        degerMetni: m.value_f?.replace(/<[^>]+>/g, "").trim(),
        sonGuncelleme: m.data_at_f,
      };
    })
    .sort((a, b) => {
      // veri olanlar önce
      if ((a.deger !== undefined) !== (b.deger !== undefined)) return a.deger !== undefined ? -1 : 1;
      return (a.fieldName ?? "").localeCompare(b.fieldName ?? "", "tr");
    });

  return { istasyonlar, nemSensorleri };
}

// "Toprak Nemi" ölçümünün platform genelinde sabit anahtarı (Hava Sıcaklığı'nın
// 163, Bağıl Nem'in 164 olması gibi — cihazdan bağımsız, ölçüm tipine özel).
const TOPRAK_NEMI_FW_KEY = 167;

function tarihSaatiAyikla(x_f: string) {
  const [tarih, saat] = x_f.split(" ");
  const [gg, aa, yyyy] = tarih.split(".").map(Number);
  const [ss, dd] = saat.split(":").map(Number);
  const gunAnahtari = `${yyyy}-${String(aa).padStart(2, "0")}-${String(gg).padStart(2, "0")}`;
  const iso = `${gunAnahtari}T${String(ss).padStart(2, "0")}:${String(dd).padStart(2, "0")}`;
  return { gunAnahtari, saat: ss, iso, gg, aa, yyyy };
}

// Bir toprak nemi sensörünün 20/40/60/80cm derinliklerindeki ham verisinden
// "Ağırlıklı Kök Bölgesi Nem İndeksi"ni türetir: her gün, hangi derinlik o gün
// en çok dalgalandıysa (maks-min farkı en büyükse) o derinliğe o gün için daha
// fazla ağırlık verilir; bu ağırlıklar aynı günün 2 saatlik ortalamalarıyla
// çarpılıp toplanarak tek bir bileşik eğri elde edilir.
export async function getTopraqNemProfili(
  customerId: number,
  fieldId: number,
  deviceId: number,
  gunSayisi = 14,
): Promise<TopraqNemProfili | null> {
  const session = await switchCustomer(customerId);
  const bitis = Date.now();
  // Bir gün fazladan çekilip en baştaki (yarım) gün atılır — aksi halde
  // pencerenin başladığı an gün ortasına denk gelirse o gün için fark/ağırlık
  // hesabı yanıltıcı (neredeyse sıfır) çıkar.
  const baslangic = bitis - (gunSayisi + 1) * 24 * 3600 * 1000;
  const body = await apiGet(
    `field/${fieldId}/device/${deviceId}/measurement/${TOPRAK_NEMI_FW_KEY}/data?start_at=${baslangic}&end_at=${bitis}`,
    session,
  );

  const meta = body?.data as { field?: { name: string }; device?: { label: string } } | undefined;
  const gruplar = body?.data?.data as
    | Array<{ axes: { y: { title?: string } }; series: Array<{ title: string; data: Array<{ x: number; x_f: string; y: number }> }> }>
    | undefined;
  if (!meta || !gruplar) return null;

  const nemGrubu = gruplar.find((g) => g.axes?.y?.title === "Toprak Nemi");
  const debiGrubu = gruplar.find((g) => g.axes?.y?.title === "Debi");
  if (!nemGrubu) return null;

  const derinlikSerisi = new Map<string, Map<number, number>>();
  for (const seri of nemGrubu.series) {
    const derinlik = seri.title.replace(/\s*cm$/i, "").trim();
    derinlikSerisi.set(derinlik, new Map(seri.data.map((p) => [p.x, p.y])));
  }
  const debiSerisi = new Map((debiGrubu?.series?.[0]?.data ?? []).map((p) => [p.x, p.y]));
  const zamanEtiketi = new Map((nemGrubu.series[0]?.data ?? []).map((p) => [p.x, p.x_f]));

  const derinlikler = ["20", "40", "60", "80"] as const;
  const s20 = derinlikSerisi.get("20");
  if (!s20) return null;

  // Ham satırlar: aynı x (zaman) için 4 derinlik + debi bir araya getirilir.
  const hamSatirlar: { x: number; x_f: string; degerler: Record<string, number>; debi: number }[] = [];
  for (const [x, v20] of s20) {
    const degerler: Record<string, number> = { "20": v20 };
    let eksik = false;
    for (const d of derinlikler.slice(1)) {
      const v = derinlikSerisi.get(d)?.get(x);
      if (v === undefined) { eksik = true; break; }
      degerler[d] = v;
    }
    if (eksik) continue;
    const x_f = zamanEtiketi.get(x);
    if (!x_f) continue;
    hamSatirlar.push({ x, x_f, degerler, debi: debiSerisi.get(x) ?? 0 });
  }
  hamSatirlar.sort((a, b) => a.x - b.x);
  if (hamSatirlar.length === 0) return null;

  // Adım 1 & 2: gün bazında fark ve ağırlık.
  const gunGruplari = new Map<string, typeof hamSatirlar>();
  for (const satir of hamSatirlar) {
    const { gunAnahtari } = tarihSaatiAyikla(satir.x_f);
    if (!gunGruplari.has(gunAnahtari)) gunGruplari.set(gunAnahtari, []);
    gunGruplari.get(gunAnahtari)!.push(satir);
  }
  // Fazladan çekilen tampon günün (en baştaki, yarım olabilecek gün) hem
  // tablo hem grafikten düşürülmesi — bkz. yukarıdaki not.
  const siraliGunAnahtarlari = Array.from(gunGruplari.keys()).sort((a, b) => a.localeCompare(b));
  if (siraliGunAnahtarlari.length > gunSayisi) gunGruplari.delete(siraliGunAnahtarlari[0]);

  const gunAgirliklari = new Map<string, Record<string, number>>();
  const gunler: TopraqNemGunu[] = [];
  for (const [gunAnahtari, satirlar] of Array.from(gunGruplari.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const farklar: Record<string, number> = {};
    for (const d of derinlikler) {
      const degerler = satirlar.map((s) => s.degerler[d]);
      farklar[d] = Math.max(...degerler) - Math.min(...degerler);
    }
    const toplamFark = derinlikler.reduce((a, d) => a + farklar[d], 0);
    const agirliklar: Record<string, number> = {};
    for (const d of derinlikler) agirliklar[d] = toplamFark > 0 ? farklar[d] / toplamFark : 0.25;
    gunAgirliklari.set(gunAnahtari, agirliklar);

    const [yyyy, aa, gg] = gunAnahtari.split("-");
    gunler.push({
      date: `${gg}.${aa}.${yyyy}`,
      r20: Math.round(farklar["20"] * 10) / 10,
      r40: Math.round(farklar["40"] * 10) / 10,
      r60: Math.round(farklar["60"] * 10) / 10,
      r80: Math.round(farklar["80"] * 10) / 10,
      w20: Math.round(agirliklar["20"] * 1000) / 10,
      w40: Math.round(agirliklar["40"] * 1000) / 10,
      w60: Math.round(agirliklar["60"] * 1000) / 10,
      w80: Math.round(agirliklar["80"] * 1000) / 10,
      sulama: satirlar.some((s) => s.debi > 0),
    });
  }

  // Adım 3: 2 saatlik kovalara ortalama al, o günün ağırlığıyla çarp.
  const kovalar = new Map<string, typeof hamSatirlar>();
  for (const satir of hamSatirlar) {
    const { gunAnahtari, saat } = tarihSaatiAyikla(satir.x_f);
    if (!gunAgirliklari.has(gunAnahtari)) continue; // düşürülen tampon gün
    const kovaSaati = Math.floor(saat / 2) * 2;
    const kovaAnahtari = `${gunAnahtari}T${String(kovaSaati).padStart(2, "0")}:00`;
    if (!kovalar.has(kovaAnahtari)) kovalar.set(kovaAnahtari, []);
    kovalar.get(kovaAnahtari)!.push(satir);
  }

  const ortalama = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const buckets: TopraqNemNoktasi[] = Array.from(kovalar.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([kovaAnahtari, satirlar]) => {
      const gunAnahtari = kovaAnahtari.slice(0, 10);
      const agirliklar = gunAgirliklari.get(gunAnahtari)!;
      const ortalamalar: Record<string, number> = {};
      for (const d of derinlikler) ortalamalar[d] = ortalama(satirlar.map((s) => s.degerler[d]));
      const weighted = derinlikler.reduce((a, d) => a + agirliklar[d] * ortalamalar[d], 0);
      return {
        t: kovaAnahtari,
        v20: Math.round(ortalamalar["20"] * 100) / 100,
        v40: Math.round(ortalamalar["40"] * 100) / 100,
        v60: Math.round(ortalamalar["60"] * 100) / 100,
        v80: Math.round(ortalamalar["80"] * 100) / 100,
        debi: Math.round(ortalama(satirlar.map((s) => s.debi)) * 100) / 100,
        w20: Math.round(agirliklar["20"] * 1000) / 10,
        w40: Math.round(agirliklar["40"] * 1000) / 10,
        w60: Math.round(agirliklar["60"] * 1000) / 10,
        w80: Math.round(agirliklar["80"] * 1000) / 10,
        weighted: Math.round(weighted * 1000) / 1000,
      };
    });

  return { fieldName: meta.field?.name ?? "", deviceLabel: meta.device?.label ?? "", buckets, gunler };
}

// getTopraqNemProfili'nin 2 saatlik "buckets" dizisini ToprakNemiChart'ın
// beklediği günlük özete indirger (her derinlik + ağırlıklı ortalamanın o
// günkü 2 saatlik noktalarının ortalaması).
export function nemGunlukOzet(profil: TopraqNemProfili): ToprakNemGunlukOzet[] {
  const gunler = new Map<string, { n20: number[]; n40: number[]; n60: number[]; n80: number[]; w: number[] }>();
  for (const b of profil.buckets) {
    const gun = b.t.slice(0, 10);
    if (!gunler.has(gun)) gunler.set(gun, { n20: [], n40: [], n60: [], n80: [], w: [] });
    const k = gunler.get(gun)!;
    k.n20.push(b.v20);
    k.n40.push(b.v40);
    k.n60.push(b.v60);
    k.n80.push(b.v80);
    k.w.push(b.weighted);
  }
  const ortalama = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  return Array.from(gunler.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tarih, k]) => ({
      tarih,
      nem20: Math.round(ortalama(k.n20) * 10) / 10,
      nem40: Math.round(ortalama(k.n40) * 10) / 10,
      nem60: Math.round(ortalama(k.n60) * 10) / 10,
      nem80: Math.round(ortalama(k.n80) * 10) / 10,
      nemAgirlikli: Math.round(ortalama(k.w) * 10) / 10,
    }));
}

function ddmmyyyyToIsoGun(x_f: string): string | null {
  const tarih = x_f.split(" ")[0];
  if (!tarih) return null;
  const [gg, aa, yyyy] = tarih.split(".").map(Number);
  if (!gg || !aa || !yyyy) return null;
  return `${yyyy}-${String(aa).padStart(2, "0")}-${String(gg).padStart(2, "0")}`;
}

// SicaklikChart/BagilNemChart için gerçek günlük özet — report/weather/data'nın
// varsayılan yanıtı (criterias'ın seçili filtresi) sadece "bugün"ü döndürüyor;
// burada start_at/end_at açıkça geçilerek istenen gün sayısı kadar geriye
// gidilir (getTopraqNemProfili'nin baslangic/bitis hesabıyla aynı desen).
export async function istasyonGunlukOzet(customerId: number, fieldId: number, gunSayisi = 90): Promise<HavaGunlukOzet[] | null> {
  const session = await switchCustomer(customerId);
  const criteria = (await apiPost("report/weather/criterias", session, { field_id: fieldId }))?.data;
  if (!criteria) return null;

  const bitis = Date.now();
  const baslangic = bitis - gunSayisi * 24 * 3600 * 1000;
  const govde = { ...criteria, start_at: baslangic, end_at: bitis };

  const data = (await apiPost("report/weather/data", session, govde))?.data as
    | Array<{ data: Array<{ series: Array<{ title: string; data: Array<{ x_f: string; y: number }> }> }> }>
    | undefined;
  if (!data) return null;

  const gunler = new Map<string, { templer: number[]; nemler: number[] }>();
  for (const entry of data) {
    for (const grup of entry.data ?? []) {
      for (const seri of grup.series ?? []) {
        if (seri.title !== "Hava Sıcaklığı" && seri.title !== "Bağıl Nem") continue;
        for (const nokta of seri.data ?? []) {
          const gunAnahtari = ddmmyyyyToIsoGun(nokta.x_f);
          if (!gunAnahtari) continue;
          if (!gunler.has(gunAnahtari)) gunler.set(gunAnahtari, { templer: [], nemler: [] });
          const kayit = gunler.get(gunAnahtari)!;
          if (seri.title === "Hava Sıcaklığı") kayit.templer.push(nokta.y);
          else kayit.nemler.push(nokta.y);
        }
      }
    }
  }
  if (gunler.size === 0) return null;

  const ortalama = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return Array.from(gunler.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tarih, { templer, nemler }]) => ({
      tarih,
      tempMin: templer.length ? Math.round(Math.min(...templer) * 10) / 10 : 0,
      tempMax: templer.length ? Math.round(Math.max(...templer) * 10) / 10 : 0,
      bagilNem: nemler.length ? Math.round(ortalama(nemler) * 10) / 10 : 0,
    }));
}

// --- Parsel <-> topraq.ai otomatik eşleştirme --------------------------------

function centroid(sinir: LatLng[]): LatLng {
  let sumLat = 0;
  let sumLng = 0;
  for (const p of sinir) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  return { lat: sumLat / sinir.length, lng: sumLng / sinir.length };
}

function haversineMetre(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function cihazKonumu(d: AgroDevice): LatLng | null {
  if (d.field?.center) return { lat: d.field.center.latitude, lng: d.field.center.longitude };
  if (d.location) return { lat: d.location.latitude, lng: d.location.longitude };
  return null;
}

// Verilen noktaya (parselin merkezi) en yakın field bilgisi olan cihazı bulur —
// topraq.ai'de çizilen alan poligonlarının kendi field id'si yok, bu yüzden
// "hangi tarlaya ait" bilgisini konuma en yakın cihazdan ödünç alıyoruz.
function enYakinCihaz(devices: AgroDevice[], nokta: LatLng): AgroDevice | null {
  let en: AgroDevice | null = null;
  let enUzaklik = Infinity;
  for (const d of devices) {
    if (!d.field) continue;
    const konum = cihazKonumu(d);
    if (!konum) continue;
    const uzaklik = haversineMetre(nokta, konum);
    if (uzaklik < enUzaklik) {
      enUzaklik = uzaklik;
      en = d;
    }
  }
  return en;
}

async function alanEslesmesiOlustur(
  session: TopraqSession,
  customerId: number,
  alan: { id: number; name: string },
  devices: AgroDevice[],
  merkez: LatLng,
): Promise<TopraqEslesme> {
  const alanCihazlari = devices.filter((d) => d.field?.id === alan.id);

  let nemDeviceId: number | undefined;
  try {
    const nemIdSeti = await moistureDeviceIds(session);
    nemDeviceId = alanCihazlari.find((d) => nemIdSeti.has(d.id))?.id;
  } catch {
    nemDeviceId = undefined;
  }

  const istasyonlar = alanCihazlari
    .filter((d) => d.type === "weather")
    .map((d) => ({ d, konum: cihazKonumu(d) }))
    .filter((x): x is { d: AgroDevice; konum: LatLng } => x.konum !== null)
    .sort((a, b) => haversineMetre(merkez, a.konum) - haversineMetre(merkez, b.konum));
  const istasyonDeviceId = istasyonlar[0]?.d.id;

  return {
    customerId,
    fieldId: alan.id,
    fieldName: alan.name,
    nemDeviceId,
    istasyonDeviceId,
    eslestirmeTarihi: new Date().toISOString(),
  };
}

// Parsel seçeneği yoksa (poligon eşleşmesi bulunamadıysa) yedek olarak kabul
// edilecek en fazla mesafe — bu eşiğin üstündeki "en yakın cihaz" güvenilir
// bir eşleşme sayılmaz, dürüst boş durum tercih edilir.
const FALLBACK_ESIK_METRE = 400;

// Bir parsel sınırı çizildiğinde/güncellendiğinde çağrılır: TÜM topraq.ai
// çiftliklerini tarar, merkez noktasının hangi çiftlikteki hangi elle çizilmiş
// alan poligonunun içine düştüğünü bulur (varsa), yoksa en yakın cihaz alanını
// belli bir mesafe eşiği altında yedek olarak kabul eder. Hiçbiri olmazsa null
// döner — çağıran taraf (actions.ts) bunu try/catch ile sarmalı, bu fonksiyon
// asla parsel kaydını bozmamalı.
export async function parselEslestir(sinir: LatLng[]): Promise<TopraqEslesme | null> {
  if (!sinir || sinir.length < 3) return null;
  const merkez = centroid(sinir);
  const merkezNokta = point([merkez.lng, merkez.lat]);

  const ciftlikler = await topraqCiftlikleriGetir();

  let enYakinGenel: { customerId: number; session: TopraqSession; devices: AgroDevice[]; device: AgroDevice; uzaklik: number } | null = null;

  for (const c of ciftlikler) {
    let session: TopraqSession;
    let devices: AgroDevice[];
    let alanlar: AgroParcel[];
    try {
      session = await switchCustomer(c.id);
      ({ devices, parcels: alanlar } = await agroMapData(session));
    } catch {
      continue; // bu çiftlik okunamadı (token/ağ hatası), diğerlerine devam
    }

    // Adım 1: çizilen sınırın merkezi bu çiftlikteki poligonlardan birinin içinde mi?
    for (const alan of alanlar) {
      const coords = alan.coordinates;
      if (!coords || coords.length < 3) continue;
      const ring: [number, number][] = coords.map((k) => [k.longitude, k.latitude]);
      const ilk = ring[0];
      const son = ring[ring.length - 1];
      if (ilk[0] !== son[0] || ilk[1] !== son[1]) ring.push(ilk);
      if (ring.length < 4) continue;

      let icinde = false;
      try {
        icinde = booleanPointInPolygon(merkezNokta, turfPolygon([ring]));
      } catch {
        icinde = false;
      }
      if (!icinde) continue;

      const yakinCihaz = enYakinCihaz(devices, merkez);
      if (!yakinCihaz?.field) continue;
      return alanEslesmesiOlustur(session, c.id, yakinCihaz.field, devices, merkez);
    }

    // Poligon eşleşmesi bulunamadıysa, bu çiftlikteki en yakın cihazı genel
    // yedek adayı olarak işaretle (tüm çiftlikler tarandıktan sonra kullanılır).
    const yakinCihaz = enYakinCihaz(devices, merkez);
    if (yakinCihaz?.field) {
      const konum = cihazKonumu(yakinCihaz);
      if (konum) {
        const uzaklik = haversineMetre(merkez, konum);
        if (!enYakinGenel || uzaklik < enYakinGenel.uzaklik) {
          enYakinGenel = { customerId: c.id, session, devices, device: yakinCihaz, uzaklik };
        }
      }
    }
  }

  // Adım 2: yedek — hiçbir poligon eşleşmedi, en yakın cihaz alanı eşik altındaysa kabul et.
  if (enYakinGenel && enYakinGenel.uzaklik <= FALLBACK_ESIK_METRE && enYakinGenel.device.field) {
    return alanEslesmesiOlustur(enYakinGenel.session, enYakinGenel.customerId, enYakinGenel.device.field, enYakinGenel.devices, merkez);
  }

  return null;
}
