"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { gorselKucult } from "@/lib/gorselKucult";
import { Icon } from "@/components/IconSprite";
import { Toast } from "@/components/Toast";
import { useNotifications } from "@/components/NotificationsProvider";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ParcelRowActions } from "./ParcelRowActions";
import { RaporlarPanel } from "./RaporlarPanel";
import {
  createWellAction,
  updateWellAction,
  deleteWellAction,
  assignParcelToWellAction,
  createGorevAction,
  updateGorevDurumAction,
  deleteGorevAction,
  createZiyaretKaydiAction,
  deleteRecordAction,
} from "@/lib/actions";
import { tipBadgeSinifi, kayitOzeti, formatKayitTarihi, ONCELIK_PUANLARI, oncelikSinifi } from "@/lib/kayitlar";
import { FENOLOJIK_DONEM_LISTESI, ZIYARET_DURUM_SECENEKLERI } from "@/lib/tarim";
import type { Customer, Parcel, Well, Gorev, GorevDurumu, FieldRecord, RecordTypeDef, HavaGunlukOzet } from "@/types";

type Tab = "genel" | "ziyaret" | "parseller" | "kuyular" | "uygulamalar" | "gorevler" | "raporlar";
type ParcelView = "kart" | "liste";

const VARSAYILAN_TAB_SIRASI: Tab[] = ["genel", "ziyaret", "parseller", "kuyular", "uygulamalar", "gorevler", "raporlar"];
const TAB_SIRASI_ANAHTARI = "musteriDetayTabSirasi";

// Seçilen günün ait olduğu haftanın Pazartesi/Pazar tarihlerini döner —
// parsel-takip'teki (orijinal proje) HaftalikRaporForm.tsx'ten birebir
// taşındı, sadece "Hafta: X – Y" bilgi metni için kullanılıyor.
function haftaAraligi(gunStr: string): { baslangic: string; bitis: string } {
  const gun = new Date(gunStr + "T00:00:00Z");
  const haftaGunu = gun.getUTCDay() || 7; // Pazartesi=1 ... Pazar=7
  const pazartesi = new Date(gun);
  pazartesi.setUTCDate(gun.getUTCDate() - (haftaGunu - 1));
  const pazar = new Date(pazartesi);
  pazar.setUTCDate(pazartesi.getUTCDate() + 6);
  return { baslangic: pazartesi.toISOString().slice(0, 10), bitis: pazar.toISOString().slice(0, 10) };
}

function gunEkle(gunStr: string, adet: number): string {
  const gun = new Date(gunStr + "T00:00:00Z");
  gun.setUTCDate(gun.getUTCDate() + adet);
  return gun.toISOString().slice(0, 10);
}

function formatHaftaGunu(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
}

const GOREV_DURUM_ETIKET: Record<GorevDurumu, string> = {
  bekliyor: "Bekliyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal Edildi",
};

function formatGorevTarihi(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatDonum(n: number) {
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dönüm`;
}

function formatParcelDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function CustomerDetailTabs({
  customer,
  parcels,
  wells,
  gorevler,
  records,
  recordTypes,
  beslenmePlanSayilari = {},
  fertigasyonKayitSayilari = {},
  sulamaPlanSayilari = {},
  yaprakGubrelemeYilSayilari = {},
  havaVerileri = {},
  createdAtLabel,
  initialTab = "genel",
  banner = null,
}: {
  customer: Customer;
  parcels: Parcel[];
  /** parselId -> tanımlı beslenme planı sayısı — musteriler/[id]/page.tsx'te önceden hesaplanır. */
  beslenmePlanSayilari?: Record<string, number>;
  /** parselId -> girilmiş fertigasyon kaydı sayısı — musteriler/[id]/page.tsx'te önceden hesaplanır. */
  fertigasyonKayitSayilari?: Record<string, number>;
  /** parselId -> tanımlı sulama planı sayısı — musteriler/[id]/page.tsx'te önceden hesaplanır. */
  sulamaPlanSayilari?: Record<string, number>;
  /** parselId -> kaydedilmiş yaprak gübreleme planı yıl sayısı — musteriler/[id]/page.tsx'te önceden hesaplanır. */
  yaprakGubrelemeYilSayilari?: Record<string, number>;
  /** parselId -> topraq.ai 90 günlük hava verisi (Raporlar sekmesi için) — musteriler/[id]/page.tsx'te önceden hesaplanır. */
  havaVerileri?: Record<string, HavaGunlukOzet[] | null>;
  wells: Well[];
  gorevler: Gorev[];
  /** Ziyaret Kaydı sekmesi için — bu müşterinin TÜM parsellerindeki saha kayıtları. */
  records: FieldRecord[];
  /** Ziyaret Kaydı sekmesindeki İlaçlama/Gübreleme/Yaprak Gübresi/Gözlem tip eşlemesi için. */
  recordTypes: RecordTypeDef[];
  createdAtLabel: string;
  initialTab?: Tab;
  /** ?parselEklendi=/?parselGuncellendi= query param'ından gelir — bkz. musteriler/[id]/page.tsx */
  banner?: string | null;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [parcelView, setParcelViewState] = useState<ParcelView>("kart");
  const { addNotification } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  // Sulama Kuyuları sekmesi — inline "kuyu ekle" formu ve satır içi yeniden
  // adlandırma için yerel state. Veri (wells/parcels) sunucudan prop olarak
  // gelir; her başarılı action sonrası router.refresh() ile tazelenir.
  const [kuyuEkleAcik, setKuyuEkleAcik] = useState(false);
  const [yeniKuyuAdi, setYeniKuyuAdi] = useState("");
  const [kuyuEkleniyor, setKuyuEkleniyor] = useState(false);
  const [duzenlenenKuyuId, setDuzenlenenKuyuId] = useState<string | null>(null);
  const [duzenlenenKuyuAdi, setDuzenlenenKuyuAdi] = useState("");
  const [kuyuKaydediliyor, setKuyuKaydediliyor] = useState(false);
  const [atamaBekleyenAnahtar, setAtamaBekleyenAnahtar] = useState<string | null>(null);

  // Görevler sekmesi — sol tarafta her zaman açık bir "Görev Ekle" kartı,
  // sağ tarafta durum/tarih filtrelenebilir liste. Yeni görev eklenince hem
  // bu listede hem Genel Bilgi'deki özet kartta anında görünür (ikisi de aynı
  // `gorevler` prop'undan besleniyor, router.refresh() ile tazelenir).
  const [yeniGorevKonu, setYeniGorevKonu] = useState("");
  const [yeniGorevDurum, setYeniGorevDurum] = useState<GorevDurumu>("bekliyor");
  const [yeniGorevNot, setYeniGorevNot] = useState("");
  const [gorevEkleniyor, setGorevEkleniyor] = useState(false);
  const [gorevDurumGuncelleniyor, setGorevDurumGuncelleniyor] = useState<string | null>(null);
  const [gorevDurumFiltre, setGorevDurumFiltre] = useState<"hepsi" | GorevDurumu>("hepsi");
  const [gorevTarihFiltre, setGorevTarihFiltre] = useState<"hepsi" | "7" | "30">("hepsi");
  const yeniGorevKonuRef = useRef<HTMLInputElement>(null);

  function gorevFormunuTemizle() {
    setYeniGorevKonu("");
    setYeniGorevDurum("bekliyor");
    setYeniGorevNot("");
  }

  async function gorevEkle() {
    const konu = yeniGorevKonu.trim();
    if (!konu) return;
    setGorevEkleniyor(true);
    try {
      const fd = new FormData();
      fd.set("konu", konu);
      fd.set("durum", yeniGorevDurum);
      if (yeniGorevNot.trim()) fd.set("not", yeniGorevNot.trim());
      await createGorevAction(customer.id, fd);
      addNotification(`Görev eklendi: ${konu}`);
      gorevFormunuTemizle();
      router.refresh();
    } finally {
      setGorevEkleniyor(false);
    }
  }

  // Tarih filtresi varsayılan "hepsi" (bu satır sadece kullanıcı bir aralık
  // seçince anlam kazanır) — göreli zaman hesabı için Date.now() render
  // sırasında çağrılıyor, SSR çıktısını etkilemiyor.
  // eslint-disable-next-line react-hooks/purity
  const simdi = Date.now();
  const gorevlerFiltrelenmis = gorevler.filter((g) => {
    if (gorevDurumFiltre !== "hepsi" && g.durum !== gorevDurumFiltre) return false;
    if (gorevTarihFiltre !== "hepsi") {
      const gunSayisi = Number(gorevTarihFiltre);
      const farkGun = (simdi - new Date(g.createdAt).getTime()) / 86400000;
      if (farkGun > gunSayisi) return false;
    }
    return true;
  });

  async function gorevDurumDegistir(gorev: Gorev, durum: GorevDurumu) {
    setGorevDurumGuncelleniyor(gorev.id);
    try {
      await updateGorevDurumAction(customer.id, gorev.id, durum);
      addNotification(`Görev durumu güncellendi: ${GOREV_DURUM_ETIKET[durum]}`);
      router.refresh();
    } finally {
      setGorevDurumGuncelleniyor(null);
    }
  }

  // Genel Bilgi'deki özet karttan "Görev Ekle"ye tıklanınca Görevler
  // sekmesine geçilir — formu artık her zaman görünür (sol sütunda),
  // sadece konu alanına odaklanılır.
  function genelGorevEkleyeGit() {
    setTab("gorevler");
    requestAnimationFrame(() => yeniGorevKonuRef.current?.focus());
  }

  async function kuyuEkle() {
    const isim = yeniKuyuAdi.trim();
    if (!isim) return;
    setKuyuEkleniyor(true);
    try {
      const fd = new FormData();
      fd.set("ad", isim);
      const yeniKuyu = await createWellAction(customer.id, fd);
      addNotification(`Kuyu eklendi: ${yeniKuyu.ad}`);
      setYeniKuyuAdi("");
      setKuyuEkleAcik(false);
      router.refresh();
    } finally {
      setKuyuEkleniyor(false);
    }
  }

  function kuyuDuzenlemeyeBasla(well: Well) {
    setDuzenlenenKuyuId(well.id);
    setDuzenlenenKuyuAdi(well.ad);
  }

  async function kuyuAdiKaydet(well: Well) {
    const isim = duzenlenenKuyuAdi.trim();
    if (!isim) return;
    setKuyuKaydediliyor(true);
    try {
      const fd = new FormData();
      fd.set("ad", isim);
      await updateWellAction(customer.id, well.id, fd);
      addNotification(`Kuyu adı güncellendi: ${isim}`);
      setDuzenlenenKuyuId(null);
      router.refresh();
    } finally {
      setKuyuKaydediliyor(false);
    }
  }

  async function parselKuyuAtamasiniDegistir(parcel: Parcel, well: Well, atanacak: boolean) {
    setAtamaBekleyenAnahtar(`${parcel.id}:${well.id}`);
    try {
      await assignParcelToWellAction(customer.id, parcel.id, well.id, atanacak);
      addNotification(atanacak ? `${parcel.ad} → ${well.ad} kuyusuna atandı.` : `${parcel.ad} kuyudan çıkarıldı.`);
      router.refresh();
    } finally {
      setAtamaBekleyenAnahtar(null);
    }
  }
  // Ziyaret Kaydı sekmesi — parsel-takip'teki (orijinal proje) "Haftalık
  // Rapor" hızlı saha ziyareti formunun sadeleştirilmiş hali. Sunucudan gelen
  // `records`/`recordTypes` prop'ları, seçili günde zaten kaydı olan
  // parselleri turuncu işaretlemek ve "Düzenle" ile forma doldurmak için
  // kullanılır; kayıt her zaman MEVCUT Kayıtlar koleksiyonuna yazılır.
  const bugunIso = new Date().toISOString().slice(0, 10);
  const [ziyaretTarih, setZiyaretTarih] = useState(bugunIso);
  const [ziyaretParselIds, setZiyaretParselIds] = useState<Set<string>>(new Set());
  const [ziyaretAciklama, setZiyaretAciklama] = useState("");
  const [ziyaretRecete, setZiyaretRecete] = useState("");
  const [ziyaretFenolojikDonem, setZiyaretFenolojikDonem] = useState("");
  const [ziyaretDurum, setZiyaretDurum] = useState("");
  const [ziyaretOncelik, setZiyaretOncelik] = useState<number | null>(null);
  const [ziyaretFotograflar, setZiyaretFotograflar] = useState<File[]>([]);
  const [ziyaretKaydediliyor, setZiyaretKaydediliyor] = useState(false);
  const [ziyaretHata, setZiyaretHata] = useState<string | null>(null);
  const [ziyaretFotoIsleniyor, setZiyaretFotoIsleniyor] = useState(false);
  const ziyaretFotoInputRef = useRef<HTMLInputElement>(null);
  // Kaydet'e basınca sayfa ortasında kısa süreli beliren onay — Toast (sağ
  // alt, kalıcı bildirim merkezine de eklenen addNotification) yetersiz
  // bulunduğu için ayrı, daha göze çarpan bir geri bildirim.
  const [kaydedildiPopup, setKaydedildiPopup] = useState(false);
  const ziyaretFormRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!kaydedildiPopup) return;
    const zamanlayici = setTimeout(() => setKaydedildiPopup(false), 2200);
    return () => clearTimeout(zamanlayici);
  }, [kaydedildiPopup]);

  // Parsel(ler) seçimi dropdown olarak açılır/kapanır — çok parselli
  // müşterilerde uzun bir checkbox ızgarası formu gereksiz uzatıyordu.
  const [parselDropdownAcik, setParselDropdownAcik] = useState(false);
  const parselDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!parselDropdownAcik) return;
    function disariTiklandi(e: MouseEvent) {
      if (parselDropdownRef.current && !parselDropdownRef.current.contains(e.target as Node)) setParselDropdownAcik(false);
    }
    document.addEventListener("mousedown", disariTiklandi);
    return () => document.removeEventListener("mousedown", disariTiklandi);
  }, [parselDropdownAcik]);

  // Ziyaret Kaydı sekmesindeki "kaydedilenler" listesi — ayrı bir veri
  // kaynağı DEĞİL, aynı `records` prop'u üzerinde tarih aralığı + serbest
  // metin aramasıyla filtreleniyor (bu müşterinin TÜM parsellerindeki kayıtlar,
  // Kayıt Ekle'den girilenler dahil — Ziyaret Kaydı formunun yazdıklarıyla
  // aynı koleksiyon).
  const [ziyaretListeArama, setZiyaretListeArama] = useState("");
  // Saha Kaydı listesinde "Görüntüle" ile açılan tek satırın id'si — aynı anda
  // en fazla bir kayıt genişletilmiş olabilir.
  const [genisletilenKayitId, setGenisletilenKayitId] = useState<string | null>(null);
  const [ziyaretListeTarihFiltre, setZiyaretListeTarihFiltre] = useState<"hepsi" | "7" | "30" | "90">("30");
  const parcelAdMap = useMemo(() => new Map(parcels.map((p) => [p.id, p.ad])), [parcels]);
  const recordTypeMap = useMemo(() => new Map(recordTypes.map((t) => [t.id, t])), [recordTypes]);

  const ziyaretListesi = useMemo(() => {
    const arama = ziyaretListeArama.trim().toLocaleLowerCase("tr");
    const gunSayisi = ziyaretListeTarihFiltre === "hepsi" ? null : Number(ziyaretListeTarihFiltre);
    // Date.now() render sırasında "saf değil" uyarısı veriyor — Görevler
    // sekmesindeki tarih filtresiyle aynı desen/aynı gerekçe: varsayılan
    // "30 gün" dışında bir seçenekte anlam kazanıyor, SSR çıktısını etkilemiyor.
    // eslint-disable-next-line react-hooks/purity
    const simdi = Date.now();
    const esikTarih = gunSayisi != null ? new Date(simdi - gunSayisi * 86400000).toISOString().slice(0, 10) : null;

    return records
      .filter((r) => (esikTarih ? r.tarih >= esikTarih : true))
      .filter((r) => {
        if (!arama) return true;
        const parcelAdi = parcelAdMap.get(r.parcelId) ?? "";
        const tipAdi = recordTypeMap.get(r.recordTypeId)?.ad ?? "";
        const ozet = kayitOzeti(recordTypeMap.get(r.recordTypeId), r);
        const hay = `${parcelAdi} ${tipAdi} ${ozet} ${r.not ?? ""}`.toLocaleLowerCase("tr");
        return hay.includes(arama);
      })
      .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.createdAt.localeCompare(a.createdAt));
  }, [records, ziyaretListeArama, ziyaretListeTarihFiltre, parcelAdMap, recordTypeMap]);

  const ziyaretHafta = haftaAraligi(ziyaretTarih);

  const ilacTuru = recordTypes.find((t) => t.ad === "İlaçlama");

  // Seçili GÜNE denk gelen kayıtları parsele göre bulur — o gün için zaten
  // veri girilmiş parselleri turuncu işaretleyip "Düzenle" ile doğrudan forma
  // doldurabilmek için (her tarih ayrı değerlendirilir, hafta değil).
  function ziyaretParselKayitlari(parcelId: string) {
    return records.filter((r) => r.parcelId === parcelId && r.tarih === ziyaretTarih);
  }

  // Seçili günde bir parselin mevcut kaydını forma doldurur ve SADECE o
  // parseli seçili bırakır — iki farklı parselin verisi tek forma karışıp
  // biri diğerinin üzerine yazılmasın diye düzenleme her zaman tek parsel
  // bazında yapılır.
  function ziyaretKayitlariniDoldur(parcelId: string) {
    const eslesenler = ziyaretParselKayitlari(parcelId);
    if (eslesenler.length === 0) return;
    const ilacKaydi = eslesenler.find((k) => k.recordTypeId === ilacTuru?.id);
    const anaKayit = eslesenler[0]!;

    setZiyaretRecete((ilacKaydi?.values?.recete as string) ?? "");
    setZiyaretAciklama(anaKayit.not ?? "");
    setZiyaretFenolojikDonem(anaKayit.fenolojikDonem ?? "");
    setZiyaretDurum(anaKayit.durum ?? "");
    setZiyaretOncelik(anaKayit.oncelikPuani ?? null);
    setZiyaretParselIds(new Set([parcelId]));
  }

  // Saha Kaydı listesindeki "Düzenle" kalemiyle TEK bir kaydı doğrudan forma
  // doldurur — ziyaretKayitlariniDoldur'dan farkı, günü/parseli elle eşleştirmek
  // yerine tıklanan kaydın kendi tarih/parsel bilgisini kullanması. Form hâlâ
  // sadece createZiyaretKaydiAction'ın upsert ettiği alanları (not, reçete
  // [sadece İlaçlama], fenolojik dönem, durum, öncelik) destekliyor — Gübreleme/
  // Sulama/Hastalık gibi diğer tiplerin kendine özgü alanları bu sade formda
  // yok, o kayıtlar için Kaydet'e basmak o tipin verisini DEĞİL, aynı gün için
  // bir Gözlem/İlaçlama kaydı oluşturur/günceller (createZiyaretKaydiAction'daki
  // mevcut davranış).
  function kayitDuzenlemeyeAc(kayit: FieldRecord) {
    setZiyaretTarih(kayit.tarih);
    setZiyaretParselIds(new Set([kayit.parcelId]));
    setZiyaretRecete(kayit.recordTypeId === ilacTuru?.id ? ((kayit.values?.recete as string) ?? "") : "");
    setZiyaretAciklama(kayit.not ?? "");
    setZiyaretFenolojikDonem(kayit.fenolojikDonem ?? "");
    setZiyaretDurum(kayit.durum ?? "");
    setZiyaretOncelik(kayit.oncelikPuani ?? null);
    setTab("ziyaret");
    setGenisletilenKayitId(null);
    requestAnimationFrame(() => ziyaretFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function ziyaretParselToggle(parcel: Parcel, secildi: boolean) {
    if (!secildi) {
      setZiyaretParselIds((onceki) => {
        const yeni = new Set(onceki);
        yeni.delete(parcel.id);
        return yeni;
      });
      return;
    }
    if (ziyaretParselKayitlari(parcel.id).length > 0) {
      ziyaretKayitlariniDoldur(parcel.id);
      return;
    }
    setZiyaretParselIds((onceki) => new Set(onceki).add(parcel.id));
  }

  function ziyaretFormunuTemizle() {
    setZiyaretParselIds(new Set());
    setZiyaretAciklama("");
    setZiyaretRecete("");
    setZiyaretFenolojikDonem("");
    setZiyaretDurum("");
    setZiyaretOncelik(null);
    setZiyaretFotograflar([]);
  }

  // Seçilen fotoğrafların küçük önizlemeleri için — useMemo ile türetilir
  // (render sırasında yan etkisiz bir "hesaplama" gibi ele alınır), bellek
  // sızıntısı olmasın diye dosya listesi değiştiğinde/unmount'ta önceki blob
  // URL'leri ayrı bir effect'in cleanup'ında geri alınır (revoke).
  const ziyaretFotoOnizlemeUrls = useMemo(
    () => ziyaretFotograflar.map((dosya) => URL.createObjectURL(dosya)),
    [ziyaretFotograflar],
  );
  useEffect(() => {
    return () => {
      ziyaretFotoOnizlemeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [ziyaretFotoOnizlemeUrls]);

  async function ziyaretFotoSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const secilenler = Array.from(e.target.files ?? []);
    // Aynı dosya tekrar seçilebilsin diye input sıfırlanır.
    e.target.value = "";
    if (secilenler.length === 0) return;
    setZiyaretFotoIsleniyor(true);
    try {
      const kucultulenler = await Promise.all(secilenler.map((d) => gorselKucult(d)));
      setZiyaretFotograflar((onceki) => [...onceki, ...kucultulenler]);
    } finally {
      setZiyaretFotoIsleniyor(false);
    }
  }

  function ziyaretFotoKaldir(index: number) {
    setZiyaretFotograflar((onceki) => onceki.filter((_, i) => i !== index));
  }

  async function ziyaretKaydet() {
    if (ziyaretParselIds.size === 0 || !ziyaretTarih) return;
    setZiyaretKaydediliyor(true);
    setZiyaretHata(null);
    try {
      const fd = new FormData();
      fd.set("tarih", ziyaretTarih);
      ziyaretParselIds.forEach((id) => fd.append("parcelIds", id));
      if (ziyaretAciklama.trim()) fd.set("aciklama", ziyaretAciklama.trim());
      if (ziyaretRecete.trim()) fd.set("recete", ziyaretRecete.trim());
      if (ziyaretFenolojikDonem) fd.set("fenolojikDonem", ziyaretFenolojikDonem);
      if (ziyaretDurum) fd.set("durum", ziyaretDurum);
      if (ziyaretOncelik != null) fd.set("oncelikPuani", String(ziyaretOncelik));
      ziyaretFotograflar.forEach((dosya) => fd.append("fotograflar", dosya));

      await createZiyaretKaydiAction(customer.id, fd);
      addNotification("Ziyaret kaydı eklendi.");
      setKaydedildiPopup(true);
      ziyaretFormunuTemizle();
      router.refresh();
    } catch (err) {
      // Kayıt başarısızsa form olduğu gibi kalır (veri kaybolmasın) ama kullanıcı
      // kaydın yapılmadığını açıkça görür — eskiden hata sessizce yutuluyordu.
      console.error("Ziyaret kaydı kaydedilemedi:", err);
      setZiyaretHata("Kayıt yapılamadı. Bağlantınızı kontrol edip tekrar deneyin; seçimleriniz korundu.");
    } finally {
      setZiyaretKaydediliyor(false);
    }
  }

  // React Strict Mode geliştirme modunda effect'leri iki kez çalıştırır — addNotification
  // gibi tekrarlanabilir olmayan bir yan etki bu ref olmadan aynı banner için iki kayıt açardı.
  const bildirilenBannerRef = useRef<string | null>(null);

  // Banner URL'deki ?parselEklendi=/?parselGuncellendi='den geliyor — ParcelDetailView.tsx'teki
  // banner temizleme deseninin aynısı: kalıcı kalmasın diye kısa süre sonra URL'den temizlenir.
  useEffect(() => {
    if (!banner) return;
    if (bildirilenBannerRef.current !== banner) {
      bildirilenBannerRef.current = banner;
      addNotification(banner);
    }
    const zamanlayici = setTimeout(() => router.replace(pathname, { scroll: false }), 4000);
    return () => clearTimeout(zamanlayici);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);

  // Kart/Liste tercihi tarayıcıda hatırlansın diye localStorage'a yazılır —
  // sayfa yenilense de aynı görünümde açılır.
  useEffect(() => {
    const saved = localStorage.getItem("parselGorunum");
    // Sunucu her zaman "kart" ile render ediyor (hydration uyuşmazlığı olmasın diye);
    // kayıtlı tercih farklıysa mount sonrası burada devreye alınıyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "kart" || saved === "liste") setParcelViewState(saved);
  }, []);

  function setParcelView(view: ParcelView) {
    setParcelViewState(view);
    try {
      localStorage.setItem("parselGorunum", view);
    } catch {
      // gizli sekme / depolama kapalı — sessizce yok say
    }
  }

  // Sekme sırası sürükle-bırakla değiştirilebilir ve tarayıcıda hatırlanır —
  // sunucu her zaman VARSAYILAN_TAB_SIRASI ile render eder (hydration
  // uyuşmazlığı olmasın diye), kayıtlı sıra mount sonrası burada devreye alınır.
  const [tabSirasi, setTabSirasi] = useState<Tab[]>(VARSAYILAN_TAB_SIRASI);
  const [suruklenenTab, setSuruklenenTab] = useState<Tab | null>(null);

  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(TAB_SIRASI_ANAHTARI);
      if (!kayitli) return;
      const ayrilmis: unknown = JSON.parse(kayitli);
      if (!Array.isArray(ayrilmis)) return;
      const gecerliIdler = new Set<Tab>(VARSAYILAN_TAB_SIRASI);
      const suzulmus = ayrilmis.filter((id): id is Tab => typeof id === "string" && gecerliIdler.has(id as Tab));
      const eksikler = VARSAYILAN_TAB_SIRASI.filter((id) => !suzulmus.includes(id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount sonrası localStorage'dan tek seferlik senkron okuma (bkz. parselGorunum effect'i)
      if (suzulmus.length > 0) setTabSirasi([...suzulmus, ...eksikler]);
    } catch {
      // localStorage okunamazsa (gizli sekme vb.) varsayılan sırayla devam edilir.
    }
  }, []);

  function tabSurukleBirak(hedefId: Tab) {
    if (!suruklenenTab || suruklenenTab === hedefId) return;
    setTabSirasi((onceki) => {
      const yeni = onceki.filter((id) => id !== suruklenenTab);
      const hedefIndex = yeni.indexOf(hedefId);
      yeni.splice(hedefIndex, 0, suruklenenTab);
      try {
        localStorage.setItem(TAB_SIRASI_ANAHTARI, JSON.stringify(yeni));
      } catch {
        // sessizce yok say — sıralama bu oturumda yine de çalışır.
      }
      return yeni;
    });
  }

  const tabTanimlari = useMemo<Record<Tab, { label: string; icon?: string; count?: number }>>(
    () => ({
      genel: { label: "Genel Bilgi" },
      ziyaret: { label: "Ziyaret Kaydı", icon: "edit" },
      parseller: { label: "Parseller", count: parcels.length },
      kuyular: { label: "Sulama Kuyuları", icon: "well", count: wells.length },
      uygulamalar: { label: "Uygulamalar", icon: "flask" },
      gorevler: { label: "Görevler", icon: "clipboard", count: gorevler.length },
      raporlar: { label: "Raporlar" },
    }),
    [parcels.length, wells.length, gorevler.length],
  );

  const totalDonum = parcels.reduce((sum, p) => sum + (p.alanDonum || 0), 0);
  const ilkKisi = customer.ilgiliKisiler[0];
  const displayName = ilkKisi?.ad || customer.ad;
  const digerKisiler = customer.ilgiliKisiler.slice(1);

  return (
    <>
      {banner && <Toast message={banner} />}
      {kaydedildiPopup && (
        <div className="zk-onay-overlay" role="status" aria-live="polite">
          <div className="zk-onay-kart">
            <Icon name="check" className="icon" />
            <span>Ziyaret bilgisi kaydedildi.</span>
          </div>
        </div>
      )}

      <div className="tabs">
        <div className="tab-list" role="tablist">
          {tabSirasi.map((id) => {
            const t = tabTanimlari[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                className={`tab-btn${id === suruklenenTab ? " suruklenen" : ""}`}
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                draggable
                onDragStart={() => setSuruklenenTab(id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  tabSurukleBirak(id);
                }}
                onDragEnd={() => setSuruklenenTab(null)}
              >
                {t.icon && <Icon name={t.icon} />}
                {t.label}
                {t.count !== undefined && <span className="count">{t.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "genel" && (
        <div className="tab-panel" role="tabpanel">
          <div className="genel-grid">
            <div className="card profile-card">
              <div className="profile-head">
                <div className="profile-avatar">{initials(displayName)}</div>
                <div>
                  <div className="profile-head-name">{displayName}</div>
                  {ilkKisi?.ad && <div className="profile-head-label">İlgili kişi</div>}
                  {ilkKisi?.email && <div className="profile-head-email">{ilkKisi.email}</div>}
                </div>
              </div>

              <div className="profile-grid">
                <div className="profile-tile">
                  <div className="chip">
                    <Icon name="phone" />
                  </div>
                  <div className="profile-tile-body">
                    <span className="profile-tile-title">Telefon</span>
                    <span className="profile-tile-value">{ilkKisi?.telefon || "—"}</span>
                  </div>
                </div>
                <div className="profile-tile">
                  <div className="chip">
                    <Icon name="mappin" />
                  </div>
                  <div className="profile-tile-body">
                    <span className="profile-tile-title">Adres</span>
                    <span className="profile-tile-value">{customer.adres || "—"}</span>
                  </div>
                </div>
                <div className="profile-tile">
                  <div className="chip">
                    <Icon name="clock" />
                  </div>
                  <div className="profile-tile-body">
                    <span className="profile-tile-title">Kayıt tarihi</span>
                    <span className="profile-tile-value">{createdAtLabel}</span>
                  </div>
                </div>
                <div className="profile-tile">
                  <div className="chip">
                    <Icon name="map" />
                  </div>
                  <div className="profile-tile-body">
                    <span className="profile-tile-title">Toplam alan</span>
                    <span className="profile-tile-value">
                      {parcels.length === 0
                        ? "Henüz parsel yok"
                        : `${parcels.length} parsel · ${formatDonum(totalDonum)}`}
                    </span>
                  </div>
                </div>
              </div>

              {digerKisiler.length > 0 && (
                <div className="stat-list" style={{ marginTop: 18 }}>
                  {digerKisiler.map((k, i) => (
                    <div className="stat-row" key={i}>
                      <span className="k">{k.ad || "İsimsiz kişi"}</span>
                      <span className="v">{k.telefon || k.email || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card gorev-ozet-card">
              <div className="gorev-ozet-head">
                <h3>Görevler</h3>
                <button type="button" className="btn btn-sm" onClick={genelGorevEkleyeGit}>
                  <Icon name="plus" />
                  Görev Ekle
                </button>
              </div>
              {gorevler.length === 0 ? (
                <p className="gorev-ozet-empty">Henüz görev eklenmedi.</p>
              ) : (
                <div className="gorev-ozet-list">
                  {gorevler.slice(0, 5).map((gorev) => (
                    <div key={gorev.id} className="gorev-ozet-row">
                      <span className="gorev-ozet-konu">{gorev.konu}</span>
                      <span className={`durum-pill durum-${gorev.durum}`}>{GOREV_DURUM_ETIKET[gorev.durum]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "ziyaret" && (
        <div className="tab-panel" role="tabpanel">
          <div className="card zk-form" ref={ziyaretFormRef}>
            <div className="zk-col">
              <div className="field">
                <label>Gün Seç</label>
                <div className="gun-secici">
                  <button type="button" aria-label="önceki hafta" onClick={() => setZiyaretTarih((g) => gunEkle(g, -7))}>
                    <Icon name="chevron-l" />
                  </button>
                  <input type="date" value={ziyaretTarih} onChange={(e) => setZiyaretTarih(e.target.value)} />
                  <button type="button" aria-label="sonraki hafta" onClick={() => setZiyaretTarih((g) => gunEkle(g, 7))}>
                    <Icon name="chevron-r" />
                  </button>
                </div>
                <div className="hafta-info">
                  Hafta: {formatHaftaGunu(ziyaretHafta.baslangic)} – {formatHaftaGunu(ziyaretHafta.bitis)}
                </div>
              </div>

              <div className="field">
                <label style={{ margin: 0 }}>Parsel(ler)</label>
                {parcels.length === 0 ? (
                  <p className="well-empty-note">Bu müşterinin henüz parseli yok.</p>
                ) : (
                  <div className="dropdown" ref={parselDropdownRef}>
                    <button
                      type="button"
                      className={`dropdown-btn${ziyaretParselIds.size > 0 ? " dropdown-btn-aktif" : ""}`}
                      onClick={() => setParselDropdownAcik((a) => !a)}
                    >
                      {ziyaretParselIds.size === 0
                        ? "Parsel seç"
                        : ziyaretParselIds.size === 1
                          ? parcels.find((p) => ziyaretParselIds.has(p.id))?.ad
                          : `${ziyaretParselIds.size} parsel seçili`}
                      <Icon name="chevron-down" className="icon" />
                    </button>
                    {parselDropdownAcik && (
                      <div className="dropdown-panel">
                        <div className="link-row" style={{ padding: "2px 8px 6px" }}>
                          <a onClick={() => setZiyaretParselIds(new Set(parcels.map((p) => p.id)))}>Tümünü Seç</a>
                          <span className="sep">·</span>
                          <a onClick={() => setZiyaretParselIds(new Set())}>Temizle</a>
                        </div>
                        {parcels.map((parcel) => {
                          const veriVar = ziyaretParselKayitlari(parcel.id).length > 0;
                          const secili = ziyaretParselIds.has(parcel.id);
                          return (
                            <div key={parcel.id} className={`dropdown-secenek parsel-dropdown-secenek${veriVar ? " veri-var" : ""}`}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={secili}
                                  onChange={(e) => ziyaretParselToggle(parcel, e.target.checked)}
                                />
                                {parcel.ad}
                              </label>
                              {veriVar && (
                                <button
                                  type="button"
                                  className="parsel-duzenle-link"
                                  onClick={() => {
                                    ziyaretKayitlariniDoldur(parcel.id);
                                    setParselDropdownAcik(false);
                                  }}
                                >
                                  Düzenle
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="field-row2">
                <div className="field">
                  <label>Fenolojik Dönem</label>
                  <select value={ziyaretFenolojikDonem} onChange={(e) => setZiyaretFenolojikDonem(e.target.value)}>
                    <option value="">Seçilmedi</option>
                    {FENOLOJIK_DONEM_LISTESI.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Durum</label>
                  <select value={ziyaretDurum} onChange={(e) => setZiyaretDurum(e.target.value)}>
                    {ZIYARET_DURUM_SECENEKLERI.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Öncelik Puanı (opsiyonel)</label>
                <div className="oncelik-row">
                  {ONCELIK_PUANLARI.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`oncelik-pill ${oncelikSinifi(p)}${ziyaretOncelik === p ? " secili" : ""}`}
                      onClick={() => setZiyaretOncelik((onceki) => (onceki === p ? null : p))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="oncelik-hint">1 = düşük öncelik, 10 = acil müdahale gerekiyor.</div>
              </div>
            </div>

            <div className="zk-col">
              <div className="field">
                <label>Açıklama / Gözlem</label>
                <textarea
                  rows={3}
                  value={ziyaretAciklama}
                  onChange={(e) => setZiyaretAciklama(e.target.value)}
                  placeholder="Bu ziyarette görülenler, yapılan işlemler..."
                />
              </div>

              <div className="field">
                <label>Fotoğraflar (opsiyonel)</label>
                <div className="foto-dropzone">
                  {ziyaretFotograflar.map((dosya, i) => (
                    <div className="foto-thumb" key={`${dosya.name}-${i}`}>
                      <img src={ziyaretFotoOnizlemeUrls[i]} alt="" />
                      <button type="button" className="sil" aria-label="kaldır" onClick={() => ziyaretFotoKaldir(i)}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="foto-ekle-btn" onClick={() => ziyaretFotoInputRef.current?.click()}>
                    <Icon name="plus" />
                    Ekle
                  </button>
                  <input
                    ref={ziyaretFotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={ziyaretFotoSecildi}
                  />
                </div>
                <div className="foto-hint">Zararlı/hastalık, kuraklık stresi gibi gözlemleri fotoğrafla belgelemek için.</div>
              </div>

              <div className="field">
                <label>İlaç Reçetesi (opsiyonel)</label>
                <textarea
                  rows={2}
                  value={ziyaretRecete}
                  onChange={(e) => setZiyaretRecete(e.target.value)}
                  placeholder="Örn. %65 Malathion 1lt + Abamectin 1lt / 1 ton suya"
                />
              </div>

            </div>

            {ziyaretHata && (
              <p role="alert" className="zk-hata">
                {ziyaretHata}
              </p>
            )}

            <div className="zk-actions">
              <button type="button" className="btn" onClick={() => { setZiyaretHata(null); ziyaretFormunuTemizle(); }}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={ziyaretKaydet}
                disabled={ziyaretKaydediliyor || ziyaretFotoIsleniyor || ziyaretParselIds.size === 0 || !ziyaretTarih}
              >
                {ziyaretKaydediliyor ? "Kaydediliyor..." : ziyaretFotoIsleniyor ? "Fotoğraf hazırlanıyor..." : "Kaydet"}
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="toolbar">
              <div className="search">
                <Icon name="search" />
                <input
                  value={ziyaretListeArama}
                  onChange={(e) => setZiyaretListeArama(e.target.value)}
                  placeholder="Parsel, tip veya açıklamada ara..."
                />
              </div>
              <select
                className="filter-select"
                value={ziyaretListeTarihFiltre}
                onChange={(e) => setZiyaretListeTarihFiltre(e.target.value as typeof ziyaretListeTarihFiltre)}
              >
                <option value="7">Son 7 gün</option>
                <option value="30">Son 30 gün</option>
                <option value="90">Son 90 gün</option>
                <option value="hepsi">Tüm zamanlar</option>
              </select>
            </div>

            {ziyaretListesi.length === 0 ? (
              <div className="empty-note">
                {records.length === 0
                  ? "Henüz kayıt girilmedi."
                  : "Bu filtrelere uyan kayıt yok."}
              </div>
            ) : (
              <div className="saha-list">
                {ziyaretListesi.map((kayit) => {
                  const tip = recordTypeMap.get(kayit.recordTypeId);
                  const silAction = deleteRecordAction.bind(null, customer.id, kayit.parcelId);
                  const genisletilmis = genisletilenKayitId === kayit.id;
                  const doluAlanlar = tip
                    ? tip.fields
                        .map((f) => ({ label: f.label, deger: kayit.values[f.key] }))
                        .filter((f) => f.deger !== undefined && f.deger !== null && f.deger !== "")
                    : [];
                  return (
                    <div className="saha-row-grup" key={kayit.id}>
                      <div className="saha-row">
                        <span className={`tip-badge ${tip ? tipBadgeSinifi(tip.ad) : "tip-gozlem"}`}>
                          {tip && <Icon name={tip.ikon} />}
                          {tip?.ad ?? "Kayıt"}
                        </span>
                        <div className="saha-row-body">
                          <div className="saha-row-summary">
                            <strong>{parcelAdMap.get(kayit.parcelId) ?? "—"}</strong> — {kayitOzeti(tip, kayit)}
                            {kayit.gorseller && kayit.gorseller.length > 0 && (
                              <span title={`${kayit.gorseller.length} fotoğraf`}> · 📎 {kayit.gorseller.length}</span>
                            )}
                          </div>
                        </div>
                        <span className="saha-row-date">{formatKayitTarihi(kayit.tarih)}</span>
                        <div className="saha-row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Görüntüle"
                            aria-expanded={genisletilmis}
                            onClick={() => setGenisletilenKayitId((onceki) => (onceki === kayit.id ? null : kayit.id))}
                          >
                            <Icon name="eye" />
                          </button>
                          <button type="button" className="icon-btn" title="Düzenle" onClick={() => kayitDuzenlemeyeAc(kayit)}>
                            <Icon name="edit" />
                          </button>
                          <ConfirmDeleteButton
                            action={silAction.bind(null, kayit.id)}
                            message={
                              <>
                                &quot;<strong>{tip?.ad ?? "Kayıt"}</strong>&quot; kaydı silinsin mi? Bu işlem geri
                                alınamaz.
                              </>
                            }
                          />
                        </div>
                      </div>
                      {genisletilmis && (
                        <div className="saha-row-detay">
                          <dl>
                            <div>
                              <dt>Parsel</dt>
                              <dd>{parcelAdMap.get(kayit.parcelId) ?? "—"}</dd>
                            </div>
                            <div>
                              <dt>Tarih</dt>
                              <dd>{formatKayitTarihi(kayit.tarih)}</dd>
                            </div>
                            {doluAlanlar.map((f) => (
                              <div key={f.label}>
                                <dt>{f.label}</dt>
                                <dd>{String(f.deger)}</dd>
                              </div>
                            ))}
                            {kayit.fenolojikDonem && (
                              <div>
                                <dt>Fenolojik Dönem</dt>
                                <dd>{kayit.fenolojikDonem}</dd>
                              </div>
                            )}
                            {kayit.durum && (
                              <div>
                                <dt>Durum</dt>
                                <dd>{ZIYARET_DURUM_SECENEKLERI.find((d) => d.value === kayit.durum)?.label ?? kayit.durum}</dd>
                              </div>
                            )}
                            {kayit.oncelikPuani != null && (
                              <div>
                                <dt>Öncelik Puanı</dt>
                                <dd>{kayit.oncelikPuani}</dd>
                              </div>
                            )}
                            {kayit.not && (
                              <div className="saha-row-detay-genis">
                                <dt>Açıklama / Gözlem</dt>
                                <dd>{kayit.not}</dd>
                              </div>
                            )}
                          </dl>
                          {kayit.gorseller && kayit.gorseller.length > 0 && (
                            <div className="saha-row-detay-fotolar">
                              {kayit.gorseller.map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcı yüklediği serbest boyutlu fotoğraf, Image bileşeninin statik boyut gereksinimine uymuyor (bkz. yukarıdaki mevcut ziyaretFotoOnizlemeUrls <img> kullanımı, aynı gerekçe) */}
                                  <img src={url} alt="Saha fotoğrafı" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "parseller" && (
        <div className="tab-panel" role="tabpanel">
          <div className="content-head">
            {parcels.length > 0 ? (
              <div className="layout-toggle" role="group" aria-label="Görünüm">
                <button type="button" aria-current={parcelView === "kart"} onClick={() => setParcelView("kart")}>
                  Kart
                </button>
                <button type="button" aria-current={parcelView === "liste"} onClick={() => setParcelView("liste")}>
                  Liste
                </button>
              </div>
            ) : (
              <div />
            )}
            <Link href={`/musteriler/${customer.id}/parseller/yeni`} className="btn btn-primary">
              <Icon name="plus" />
              Parsel Ekle
            </Link>
          </div>

          {parcels.length === 0 ? (
            <div className="card empty-state">
              <Icon name="map" className="icon" />
              <p>Bu müşteri için henüz parsel eklenmedi.</p>
              <Link href={`/musteriler/${customer.id}/parseller/yeni`} className="btn btn-primary">
                <Icon name="plus" />
                Parsel Ekle
              </Link>
            </div>
          ) : parcelView === "kart" ? (
            <div className="parcel-grid">
              {parcels.map((parcel) => {
                const kuyuAdi = parcel.kuyuIds?.length
                  ? wells
                      .filter((w) => parcel.kuyuIds?.includes(w.id))
                      .map((w) => w.ad)
                      .join(", ")
                  : undefined;
                return (
                  <div key={parcel.id} className="card parcel-card">
                    <div className="pc-head">
                      <div className="pc-icon">
                        <Icon name="map" />
                      </div>
                      <div className="pc-title-wrap">
                        <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}`} className="pc-title pc-title-link">
                          {parcel.ad}
                        </Link>
                        <div className="pc-sub">
                          {parcel.sulamaSekli || "Sulama bilgisi yok"}
                          {kuyuAdi ? ` · ${kuyuAdi}` : ""}
                        </div>
                      </div>
                      <div className="pc-actions">
                        <ParcelRowActions customerId={customer.id} parcel={parcel} />
                      </div>
                    </div>

                    <div className="pc-stats">
                      <div className="pc-stat">
                        <span className="k">
                          <Icon name="ruler" />
                          Alan
                        </span>
                        <span className="v">{formatDonum(parcel.alanDonum)}</span>
                      </div>
                      <div className="pc-stat">
                        <span className="k">
                          <Icon name="tree" />
                          Ağaç
                        </span>
                        <span className="v">{parcel.agacSayisi != null ? parcel.agacSayisi.toLocaleString("tr-TR") : "—"}</span>
                      </div>
                    </div>

                    {parcel.urunler.length > 0 ? (
                      <div className="pc-tags">
                        {parcel.urunler.map((u, i) => (
                          <span key={i} className="pc-tag">
                            {u.urun}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="pc-empty-line">Ürün/çeşit girilmedi</div>
                    )}

                    <div className="pc-foot">
                      <Icon name="clock" />
                      {formatParcelDate(parcel.createdAt)}&apos;da eklendi
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Parsel</th>
                      <th style={{ textAlign: "right" }}>Alan</th>
                      <th style={{ textAlign: "right" }}>Ağaç</th>
                      <th>Ürün/Çeşit</th>
                      <th style={{ textAlign: "right" }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcels.map((parcel) => {
                      const kuyuAdi = parcel.kuyuIds?.length
                  ? wells
                      .filter((w) => parcel.kuyuIds?.includes(w.id))
                      .map((w) => w.ad)
                      .join(", ")
                  : undefined;
                      return (
                        <tr key={parcel.id}>
                          <td>
                            <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}`} className="pc-title pc-title-link">
                              {parcel.ad}
                            </Link>
                            <div className="pc-sub">
                              {parcel.sulamaSekli || "Sulama bilgisi yok"}
                              {kuyuAdi ? ` · ${kuyuAdi}` : ""}
                            </div>
                          </td>
                          <td className="num" style={{ textAlign: "right" }}>
                            {formatDonum(parcel.alanDonum)}
                          </td>
                          <td className="num" style={{ textAlign: "right" }}>
                            {parcel.agacSayisi != null ? parcel.agacSayisi.toLocaleString("tr-TR") : "—"}
                          </td>
                          <td>{parcel.urunler.length > 0 ? parcel.urunler.map((u) => u.urun).join(", ") : "—"}</td>
                          <td>
                            <div className="row-actions">
                              <ParcelRowActions customerId={customer.id} parcel={parcel} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "kuyular" && (
        <div className="tab-panel" role="tabpanel">
          <div className="content-head">
            <div />
            <button type="button" className="btn btn-primary" onClick={() => setKuyuEkleAcik((v) => !v)}>
              <Icon name="plus" />
              Kuyu Ekle
            </button>
          </div>

          {kuyuEkleAcik && (
            <div className="card well-add-card">
              <div className="kuyu-inline-form">
                <input
                  value={yeniKuyuAdi}
                  onChange={(e) => setYeniKuyuAdi(e.target.value)}
                  placeholder="Kuyu adı, örn. Doğu Kuyusu"
                  autoFocus
                />
                <button type="button" className="btn" onClick={() => setKuyuEkleAcik(false)}>
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={kuyuEkle}
                  disabled={kuyuEkleniyor || !yeniKuyuAdi.trim()}
                >
                  {kuyuEkleniyor ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </div>
          )}

          {wells.length === 0 ? (
            <div className="card empty-state">
              <Icon name="well" className="icon" />
              <p>Henüz kuyu eklenmedi.</p>
              <button type="button" className="btn btn-primary" onClick={() => setKuyuEkleAcik(true)}>
                <Icon name="plus" />
                Kuyu Ekle
              </button>
            </div>
          ) : (
            <div className="well-grid">
              {wells.map((well) => {
                const atanmisParseller = parcels.filter((p) => p.kuyuIds?.includes(well.id));
                const silAction = deleteWellAction.bind(null, customer.id, well.id);
                const duzenleniyor = duzenlenenKuyuId === well.id;
                return (
                  <div key={well.id} className="card well-card">
                    <div className="well-head">
                      <div className="well-icon">
                        <Icon name="well" />
                      </div>
                      <div className="well-title-wrap">
                        {duzenleniyor ? (
                          <div className="well-rename-form">
                            <input
                              className="well-rename-input"
                              value={duzenlenenKuyuAdi}
                              onChange={(e) => setDuzenlenenKuyuAdi(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") kuyuAdiKaydet(well);
                                if (e.key === "Escape") setDuzenlenenKuyuId(null);
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => kuyuAdiKaydet(well)}
                              disabled={kuyuKaydediliyor || !duzenlenenKuyuAdi.trim()}
                            >
                              {kuyuKaydediliyor ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                            <button type="button" className="btn btn-sm" onClick={() => setDuzenlenenKuyuId(null)}>
                              Vazgeç
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="well-title">{well.ad}</div>
                            <div className="well-sub">
                              {atanmisParseller.length} parsele atanmış
                            </div>
                          </>
                        )}
                      </div>
                      {!duzenleniyor && (
                        <div className="well-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Yeniden adlandır"
                            onClick={() => kuyuDuzenlemeyeBasla(well)}
                          >
                            <Icon name="edit" />
                          </button>
                          <ConfirmDeleteButton
                            action={silAction}
                            basariliMesaj="Kuyu silindi."
                            message={
                              <>
                                &quot;<strong>{well.ad}</strong>&quot; kuyusu silinsin mi? Bu kuyuya atanmış parseller
                                kuyusuz kalır. Bu işlem geri alınamaz.
                              </>
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="well-parcels">
                      <div className="well-parcels-title">Atanan Parseller</div>
                      {parcels.length === 0 ? (
                        <p className="well-empty-note">Bu müşterinin henüz parseli yok.</p>
                      ) : (
                        <div className="well-parcel-list">
                          {parcels.map((parcel) => {
                            const buKuyuyaAtanmis = parcel.kuyuIds?.includes(well.id) ?? false;
                            const digerKuyular = wells.filter(
                              (w) => w.id !== well.id && parcel.kuyuIds?.includes(w.id),
                            );
                            const anahtar = `${parcel.id}:${well.id}`;
                            return (
                              <label key={parcel.id} className="well-parcel-row">
                                <input
                                  type="checkbox"
                                  checked={buKuyuyaAtanmis}
                                  disabled={atamaBekleyenAnahtar === anahtar}
                                  onChange={(e) => parselKuyuAtamasiniDegistir(parcel, well, e.target.checked)}
                                />
                                <span className="well-parcel-name">
                                  {parcel.ad}
                                  {digerKuyular.length > 0 && (
                                    <span className="well-parcel-note">
                                      {" "}
                                      ({digerKuyular.map((w) => w.ad).join(", ")} kuyusuna da atanmış)
                                    </span>
                                  )}
                                </span>
                                <span className="well-parcel-area">{formatDonum(parcel.alanDonum)}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "uygulamalar" && (
        <div className="tab-panel" role="tabpanel">
          {parcels.length === 0 ? (
            <div className="card empty-state">
              <Icon name="flask" className="icon" />
              <p>Bu müşterinin henüz parseli yok, uygulamalar parsel eklendikten sonra görünür.</p>
              <Link href={`/musteriler/${customer.id}/parseller/yeni`} className="btn btn-primary">
                <Icon name="plus" />
                Parsel Ekle
              </Link>
            </div>
          ) : (
            <div className="uygulamalar-grup-list">
              {parcels.map((parcel) => (
                <div key={parcel.id} className="uygulamalar-grup">
                  {parcels.length > 1 && <h3 className="uygulamalar-grup-baslik">{parcel.ad}</h3>}
                  <div className="app-grid">
                    <div className="card app-card">
                      <div className="app-card-head">
                        <div className="app-chip">
                          <Icon name="sprout" />
                        </div>
                        <h4>Damlama Gübre</h4>
                      </div>
                      <div className="app-desc">Parsele tanımlı gübre/beslenme programı ve uygulama kayıtları.</div>
                      {(beslenmePlanSayilari[parcel.id] ?? 0) > 0 ? (
                        <div className="app-empty">
                          <p>
                            {parcel.ad} için {beslenmePlanSayilari[parcel.id]} sezon planı var.
                          </p>
                        </div>
                      ) : (
                        <div className="app-empty">
                          <p>{parcel.ad} için henüz beslenme planı tanımlanmadı.</p>
                        </div>
                      )}
                      <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}/beslenme`} className="app-cta app-cta-active">
                        <Icon name="plus" />
                        Plan Oluştur
                      </Link>
                    </div>

                    <div className="card app-card">
                      <div className="app-card-head">
                        <div className="app-chip">
                          <Icon name="flask" />
                        </div>
                        <h4>Fertigasyon</h4>
                      </div>
                      <div className="app-desc">Sulama suyuna karışan gübre uygulamaları ve doz hesaplamaları.</div>
                      {(fertigasyonKayitSayilari[parcel.id] ?? 0) > 0 ? (
                        <div className="app-empty">
                          <p>
                            {parcel.ad} için {fertigasyonKayitSayilari[parcel.id]} fertigasyon kaydı var.
                          </p>
                        </div>
                      ) : (
                        <div className="app-empty">
                          <p>{parcel.ad} için henüz fertigasyon kaydı girilmedi.</p>
                        </div>
                      )}
                      <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}/fertigasyon`} className="app-cta app-cta-active">
                        <Icon name="plus" />
                        Kayıt Ekle
                      </Link>
                    </div>

                    <div className="card app-card">
                      <div className="app-card-head">
                        <div className="app-chip">
                          <Icon name="compare" />
                        </div>
                        <h4>Sulama Uyumu</h4>
                      </div>
                      <div className="app-desc">Planlanan ve gerçekleşen sulamanın dönem bazında karşılaştırması.</div>
                      {(sulamaPlanSayilari[parcel.id] ?? 0) > 0 ? (
                        <div className="app-empty">
                          <p>
                            {parcel.ad} için {sulamaPlanSayilari[parcel.id]} sulama planı var.
                          </p>
                        </div>
                      ) : (
                        <div className="app-empty">
                          <p>{parcel.ad} için henüz sulama planı tanımlanmadı.</p>
                        </div>
                      )}
                      <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}/sulama-uyumu`} className="app-cta app-cta-active">
                        <Icon name="plus" />
                        Plan Oluştur
                      </Link>
                    </div>

                    <div className="card app-card">
                      <div className="app-card-head">
                        <div className="app-chip">
                          <Icon name="clipboard" />
                        </div>
                        <h4>Yaprak Gübreleme Planı</h4>
                      </div>
                      <div className="app-desc">Yıllık yaprak gübreleme uygulama planı — Block No, Cultivar, Ha ve ağaç/ha otomatik dolu.</div>
                      {(yaprakGubrelemeYilSayilari[parcel.id] ?? 0) > 0 ? (
                        <div className="app-empty">
                          <p>
                            {parcel.ad} için {yaprakGubrelemeYilSayilari[parcel.id]} yıl planı var.
                          </p>
                        </div>
                      ) : (
                        <div className="app-empty">
                          <p>{parcel.ad} için henüz yaprak gübreleme planı girilmedi.</p>
                        </div>
                      )}
                      <Link href={`/musteriler/${customer.id}/yaprak-gubreleme-plani?parcel=${parcel.id}`} className="app-cta app-cta-active">
                        <Icon name="plus" />
                        Plan Ekle
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "gorevler" && (
        <div className="tab-panel" role="tabpanel">
          <div className="gorevler-layout">
            <div className="card gorev-yeni-form">
              <h3 className="gorev-form-baslik">Görev Ekle</h3>
              <div className="field">
                <label>
                  Konu <span className="req">*</span>
                </label>
                <input
                  ref={yeniGorevKonuRef}
                  value={yeniGorevKonu}
                  onChange={(e) => setYeniGorevKonu(e.target.value)}
                  placeholder="Görev konusu, örn. Sulama sistemi kontrolü"
                />
              </div>
              <div className="field">
                <label>Durum</label>
                <select value={yeniGorevDurum} onChange={(e) => setYeniGorevDurum(e.target.value as GorevDurumu)}>
                  <option value="bekliyor">Bekliyor</option>
                  <option value="tamamlandi">Tamamlandı</option>
                  <option value="iptal">İptal Edildi</option>
                </select>
              </div>
              <div className="field">
                <label>Not</label>
                <textarea
                  value={yeniGorevNot}
                  onChange={(e) => setYeniGorevNot(e.target.value)}
                  placeholder="Opsiyonel not"
                  rows={3}
                />
              </div>
              <div className="gorev-yeni-form-actions">
                <button type="button" className="btn" onClick={gorevFormunuTemizle}>
                  Temizle
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={gorevEkle}
                  disabled={gorevEkleniyor || !yeniGorevKonu.trim()}
                >
                  {gorevEkleniyor ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </div>

            <div className="gorevler-liste-sutunu">
              <div className="card gorev-filtreler">
                <select value={gorevDurumFiltre} onChange={(e) => setGorevDurumFiltre(e.target.value as typeof gorevDurumFiltre)}>
                  <option value="hepsi">Tüm durumlar</option>
                  <option value="bekliyor">Bekliyor</option>
                  <option value="tamamlandi">Tamamlandı</option>
                  <option value="iptal">İptal Edildi</option>
                </select>
                <select value={gorevTarihFiltre} onChange={(e) => setGorevTarihFiltre(e.target.value as typeof gorevTarihFiltre)}>
                  <option value="hepsi">Tüm zamanlar</option>
                  <option value="7">Son 7 gün</option>
                  <option value="30">Son 30 gün</option>
                </select>
              </div>

              {gorevler.length === 0 ? (
                <div className="card empty-state">
                  <Icon name="clipboard" className="icon" />
                  <p>Henüz görev eklenmedi.</p>
                </div>
              ) : gorevlerFiltrelenmis.length === 0 ? (
                <div className="card empty-state">
                  <Icon name="clipboard" className="icon" />
                  <p>Filtreye uyan görev yok.</p>
                </div>
              ) : (
                <div className="gorev-grid">
                  {gorevlerFiltrelenmis.map((gorev) => {
                    const silAction = deleteGorevAction.bind(null, customer.id, gorev.id);
                    return (
                      <div key={gorev.id} className="card gorev-card">
                        <div className="gorev-head">
                          <div className="gorev-title-wrap">
                            <div className="gorev-title">{gorev.konu}</div>
                            <div className="gorev-sub">{formatGorevTarihi(gorev.createdAt)}&apos;da eklendi</div>
                          </div>
                          <div className="gorev-actions">
                            <select
                              className="gorev-durum-select"
                              value={gorev.durum}
                              disabled={gorevDurumGuncelleniyor === gorev.id}
                              onChange={(e) => gorevDurumDegistir(gorev, e.target.value as GorevDurumu)}
                            >
                              <option value="bekliyor">Bekliyor</option>
                              <option value="tamamlandi">Tamamlandı</option>
                              <option value="iptal">İptal Edildi</option>
                            </select>
                            <ConfirmDeleteButton
                              action={silAction}
                              basariliMesaj="Görev silindi."
                              message={
                                <>
                                  &quot;<strong>{gorev.konu}</strong>&quot; görevi silinsin mi? Bu işlem geri alınamaz.
                                </>
                              }
                            />
                          </div>
                        </div>
                        {gorev.not ? (
                          <div className="gorev-not">{gorev.not}</div>
                        ) : (
                          <div className="gorev-not-bos">Not eklenmedi.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "raporlar" && (
        <div className="tab-panel" role="tabpanel">
          <RaporlarPanel
            customer={customer}
            parcels={parcels}
            records={records}
            recordTypes={recordTypes}
            gorevler={gorevler}
            havaVerileri={havaVerileri}
          />
        </div>
      )}
    </>
  );
}
