"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/IconSprite";
import { DisaAktarButton } from "@/components/DisaAktarButton";
import { RaporAntetSayfasi } from "@/components/RaporAntetSayfasi";
import { RAPOR_TURLERI, raporTuruBul, type KapsamModu } from "@/lib/raporTurleri";
import { raporVerisiGetir, type RaporVerisiParams, type RaporGorunumVerisi } from "./raporVerisiAction";
import { raporSayfalariniTopla, raporAntetliPdfBlobUret } from "@/lib/disaAktar";
import { raporEpostaylaGonderAction, type RaporEpostaState } from "./raporEpostaAction";
import { formatKisaTarih, formatUzunTarih } from "@/lib/toprakMock";
import { kayitOzeti, tipBadgeSinifi, formatKayitTarihi, oncelikSinifi } from "@/lib/kayitlar";
import { ZIYARET_DURUM_SECENEKLERI } from "@/lib/tarim";
import { YAPRAK_GUBRELEME_PLANI, ygpAnahtar, ygpMetaHesapla } from "@/lib/yaprakGubrelemePlani";
import { URUN_BIRIM_PARSEL } from "@/lib/beslenme";
import { FERTIGASYON_BIRIM } from "@/lib/fertigasyon";
import type { FieldRecord } from "@/types";

// Rapor Oluştur — 10 rapor türünün hepsi için tek form + tek canlı önizleme.
// Önizlemedeki her RaporAntetSayfasi aynı zamanda dışa aktarımın okuduğu DOM
// (bkz. disaAktar.ts'in "ekranda görüneni oku" ilkesi) — bu yüzden hiçbir
// tabloda <input> yok, hepsi salt okunur metin (bu bir rapor, veri girişi değil).

interface MusteriSecenegi {
  id: string;
  ad: string;
  parceller: { id: string; ad: string }[];
}

interface OnizlemeSayfasi {
  eyebrow: string;
  baslik: string;
  altBaslik: string;
  metaSatirlari: { k: string; v: string }[];
  icerik: React.ReactNode;
}

const DURUM_ETIKETLERI = new Map(ZIYARET_DURUM_SECENEKLERI.map((d) => [d.value, d.label]));
function durumPill(durum: string): { etiket: string; sinif: "good" | "amber" | "crit" | null } {
  if (!durum) return { etiket: "—", sinif: null };
  const etiket = DURUM_ETIKETLERI.get(durum) ?? durum;
  if (durum === "acil" || durum === "kritik") return { etiket, sinif: "crit" };
  if (durum === "bekliyor" || durum === "toplanti_gerekli") return { etiket, sinif: "amber" };
  if (durum === "tamamlandi") return { etiket, sinif: "good" };
  return { etiket, sinif: null };
}

// RaporlarPanel.tsx'teki FIELD_LABELLARI'nin bilinçli küçük kopyası (bu dosya
// o bileşenden bağımsız render ediyor — haftalikRapor.ts'teki benzer
// duplikasyon notuyla aynı gerekçe).
const FIELD_LABELLARI: Record<string, string> = {
  gubreTuru: "Gübre Türü",
  doz: "Doz",
  birim: "Birim",
  uygulamaSekli: "Uygulama Şekli",
  amac: "Amaç / Hedef",
  urunAdi: "Ürün Adı",
  etkenIcerik: "Etken / İçerik",
  yontem: "Yöntem",
  etkenMadde: "Etken Madde",
  ticariAd: "Ticari Ad",
  hedef: "Hedef",
  uygulamaDetayi: "Uygulama Detayı",
  recete: "Reçete",
  sure: "Süre (saat)",
};
function kayitDegerOzeti(kayit: FieldRecord): string {
  const parcalar = Object.entries(kayit.values)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${FIELD_LABELLARI[k] ?? k}: ${v}`);
  return parcalar.length > 0 ? parcalar.join(" · ") : "—";
}

function sayiFormat(n: number | null, birim = ""): string {
  if (n === null) return "—";
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}${birim}`;
}

function bugunIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function birHaftaOncesi(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

const TIP_SIRASI_ANAHTARI = "rapor-olustur-tip-sirasi";

// Sunucu ve ilk istemci render'ı hep varsayılan sırayla eşleşsin diye
// (hydration uyuşmazlığı olmasın) localStorage'daki kayıtlı sıra ancak
// mount sonrası bir effect'te uygulanır.
function varsayilanSira(): string[] {
  return RAPOR_TURLERI.map((t) => t.id);
}

export function RaporOlusturView({ musteriler }: { musteriler: MusteriSecenegi[] }) {
  const [raporTuruId, setRaporTuruId] = useState(RAPOR_TURLERI[0]!.id);
  const raporTuru = raporTuruBul(raporTuruId)!;

  const [musteriId, setMusteriId] = useState("");
  const [parselIds, setParselIds] = useState<Set<string>>(new Set());
  const [baslangic, setBaslangic] = useState(birHaftaOncesi);
  const [bitis, setBitis] = useState(bugunIso);
  const [yil, setYil] = useState(() => new Date().getFullYear());
  const [secilenDonemler, setSecilenDonemler] = useState<Set<number>>(new Set());
  const [secilenUrunler, setSecilenUrunler] = useState<Set<string>>(new Set());

  const [veri, setVeri] = useState<RaporGorunumVerisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [olusturulmaZamani, setOlusturulmaZamani] = useState("");
  const onizlemeRef = useRef<HTMLDivElement>(null);

  const [tipSirasi, setTipSirasi] = useState<string[]>(varsayilanSira);
  const [suruklenenId, setSuruklenenId] = useState<string | null>(null);

  const [buyukGorunum, setBuyukGorunum] = useState(false);

  const [epostaAdresi, setEpostaAdresi] = useState("");
  const [epostaDurumu, setEpostaDurumu] = useState<RaporEpostaState | null>(null);
  const [epostaGonderiliyor, epostaTransitionBaslat] = useTransition();

  // "İndir"deki antetliPdfGetir ile AYNI DOM okuması (raporSayfalariniTopla) —
  // indirilen PDF ile e-postayla gidenin birebir aynı üretimden gelmesi için
  // ayrı bir veri yolu yok, sadece çıktı dosya yerine e-postaya gidiyor.
  function epostaylaGonder() {
    setEpostaDurumu(null);
    epostaTransitionBaslat(async () => {
      const toplananSayfalar = raporSayfalariniTopla(onizlemeRef.current);
      if (toplananSayfalar.length === 0) {
        setEpostaDurumu({ basarili: false, mesaj: "Önce bir önizleme oluşturun." });
        return;
      }
      const dosyaAdi = `${dosyaAdiTabani || "Rapor"}.pdf`;
      const blob = await raporAntetliPdfBlobUret(toplananSayfalar, olusturulmaZamani || new Date().toISOString());
      const formData = new FormData();
      formData.set("to", epostaAdresi);
      formData.set("raporAdi", `${raporTuru.etiket} — ${secilenMusteri?.ad ?? "Ortatepeler"}`);
      formData.set("dosyaAdi", dosyaAdi);
      formData.set("pdf", blob, dosyaAdi);
      const sonuc = await raporEpostaylaGonderAction(null, formData);
      setEpostaDurumu(sonuc);
    });
  }

  useEffect(() => {
    if (!buyukGorunum) return;
    function tusaBasildi(e: KeyboardEvent) {
      if (e.key === "Escape") setBuyukGorunum(false);
    }
    window.addEventListener("keydown", tusaBasildi);
    return () => window.removeEventListener("keydown", tusaBasildi);
  }, [buyukGorunum]);

  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(TIP_SIRASI_ANAHTARI);
      if (!kayitli) return;
      const ayrilmis: unknown = JSON.parse(kayitli);
      if (!Array.isArray(ayrilmis)) return;
      const gecerliIdler = new Set(RAPOR_TURLERI.map((t) => t.id));
      const suzulmus = ayrilmis.filter((id): id is string => typeof id === "string" && gecerliIdler.has(id));
      const eksikler = RAPOR_TURLERI.map((t) => t.id).filter((id) => !suzulmus.includes(id));
      if (suzulmus.length > 0) {
        const yeniSira = [...suzulmus, ...eksikler];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount sonrası localStorage'dan tek seferlik senkron okuma (bkz. CustomerDetailTabs.tsx aynı kalıp)
        setTipSirasi(yeniSira);
        // Sayfa açılışında kullanıcının en üste sürüklediği (en çok kullandığı) tür
        // seçili gelsin — sabit RAPOR_TURLERI[0] yerine, bkz. raporTuruId başlangıç değeri.
        setRaporTuruId(yeniSira[0]!);
      }
    } catch {
      // localStorage okunamazsa (gizli sekme vb.) varsayılan sırayla devam edilir.
    }
  }, []);

  const siraliRaporTurleri = useMemo(
    () => tipSirasi.map((id) => raporTuruBul(id)).filter((t): t is (typeof RAPOR_TURLERI)[number] => !!t),
    [tipSirasi],
  );

  function tipSurukleBirak(hedefId: string) {
    if (!suruklenenId || suruklenenId === hedefId) return;
    setTipSirasi((onceki) => {
      const yeni = onceki.filter((id) => id !== suruklenenId);
      const hedefIndex = yeni.indexOf(hedefId);
      yeni.splice(hedefIndex, 0, suruklenenId);
      try {
        localStorage.setItem(TIP_SIRASI_ANAHTARI, JSON.stringify(yeni));
      } catch {
        // sessizce yok say — sıralama bu oturumda yine de çalışır.
      }
      return yeni;
    });
  }

  const secilenMusteri = musteriler.find((m) => m.id === musteriId);
  const parselSecenekleri = secilenMusteri?.parceller ?? [];

  // Müşteri değişince eski parsel seçimleri anlamsızlaşır — bir effect yerine
  // doğrudan seçim anındaki olay yöneticisinde temizlenir (bkz. select'in
  // onChange'i), state güncellemesi efekt içinde değil kullanıcı etkileşiminde olur.
  function musteriDegistir(id: string) {
    setMusteriId(id);
    setParselIds(new Set());
  }

  const parselIdsAnahtari = Array.from(parselIds).sort().join(",");

  function raporTuruSec(id: string) {
    setRaporTuruId(id);
    setParselIds(new Set());
    setSecilenDonemler(new Set());
    setSecilenUrunler(new Set());
  }

  function tarihAraligiGerekliMi(mod: KapsamModu) {
    return mod === "hafta-araligi" || mod === "tarih-araligi" || mod === "gun-araligi" || mod === "tarih-araligi-parsel";
  }

  const kapsamGecerli = useMemo(() => {
    if (raporTuru.kapsam !== "global" && !musteriId) return false;
    if (raporTuru.parselSecimZorunlu && parselIds.size !== 1) return false;
    if (tarihAraligiGerekliMi(raporTuru.kapsamModu)) return !!baslangic && !!bitis && baslangic <= bitis;
    if (raporTuru.kapsamModu === "yil" || raporTuru.kapsamModu === "donem-urun-filtresi") return !!yil;
    return false;
  }, [raporTuru, musteriId, parselIds.size, baslangic, bitis, yil]);

  useEffect(() => {
    if (!kapsamGecerli) return;
    const params: RaporVerisiParams = {
      raporTuruId,
      musteriId: musteriId || undefined,
      parselIds: parselIds.size ? Array.from(parselIds) : undefined,
      baslangic: tarihAraligiGerekliMi(raporTuru.kapsamModu) ? baslangic : undefined,
      bitis: tarihAraligiGerekliMi(raporTuru.kapsamModu) ? bitis : undefined,
      yil: raporTuru.kapsamModu === "yil" || raporTuru.kapsamModu === "donem-urun-filtresi" ? yil : undefined,
    };
    startTransition(async () => {
      try {
        const sonuc = await raporVerisiGetir(params);
        setOlusturulmaZamani(new Date().toISOString());
        setVeri(sonuc);
        setHata(null);
      } catch (e) {
        setVeri(null);
        setHata(e instanceof Error ? e.message : "Rapor verisi alınamadı.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raporTuruId, musteriId, parselIdsAnahtari, baslangic, bitis, yil, kapsamGecerli]);

  // Tür geçişlerinde bir önceki türün verisi bir sonraki fetch tamamlanana
  // kadar state'te kalabilir (effect'in kendisi senkron temizlemez, bkz.
  // yukarıdaki not) — render sırasında `veri.tur` güncel seçimle eşleşmiyorsa
  // gösterilmez, böylece yanlış türün önizlemesi asla ekrana çıkmaz.
  const gorunenVeri = kapsamGecerli && veri?.tur === raporTuruId ? veri : null;

  const sayfalar = useMemo<OnizlemeSayfasi[]>(() => {
    if (!gorunenVeri) return [];
    return sayfalariUret(gorunenVeri, { secilenDonemler, secilenUrunler });
  }, [gorunenVeri, secilenDonemler, secilenUrunler]);

  const donemSecenekleri = useMemo(() => YAPRAK_GUBRELEME_PLANI.map((d, i) => ({ index: i, baslik: d.baslik })), []);
  const urunSecenekleri = useMemo(() => {
    const gorulen = new Set<string>();
    const liste: string[] = [];
    YAPRAK_GUBRELEME_PLANI.forEach((d) => d.urunler.forEach((u) => { if (!gorulen.has(u.ad)) { gorulen.add(u.ad); liste.push(u.ad); } }));
    return liste;
  }, []);

  function parselToggle(id: string) {
    setParselIds((onceki) => {
      const yeni = new Set(onceki);
      if (raporTuru.parselCokluSecim) {
        if (yeni.has(id)) yeni.delete(id);
        else yeni.add(id);
      } else {
        return yeni.has(id) ? new Set() : new Set([id]);
      }
      return yeni;
    });
  }

  const dosyaAdiTabani = useMemo(() => {
    const parcalar = [raporTuru.etiket.replace(/\s+/g, "-"), secilenMusteri?.ad.replace(/\s+/g, "-")];
    if (tarihAraligiGerekliMi(raporTuru.kapsamModu)) parcalar.push(baslangic, bitis);
    else if (raporTuru.kapsamModu === "yil" || raporTuru.kapsamModu === "donem-urun-filtresi") parcalar.push(String(yil));
    return parcalar.filter(Boolean).join("_");
  }, [raporTuru, secilenMusteri, baslangic, bitis, yil]);

  return (
    <div className="rapor-olustur-layout">
      <div className="card ro-form">
        <div className="ro-field span-2" style={{ marginBottom: 18 }}>
          <label>Rapor Türü</label>
          <div className="ro-tip-secim">
            {siraliRaporTurleri.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ro-tip-kart${t.id === raporTuruId ? " secili" : ""}${t.id === suruklenenId ? " suruklenen" : ""}`}
                onClick={() => raporTuruSec(t.id)}
                draggable
                onDragStart={() => setSuruklenenId(t.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  tipSurukleBirak(t.id);
                }}
                onDragEnd={() => setSuruklenenId(null)}
              >
                <div className="ro-tip-tutamac" title="Sürükleyerek sırala" aria-hidden="true">
                  <Icon name="grip" className="icon" />
                </div>
                <div className="ro-tip-ikon">
                  <Icon name={t.ikon} className="icon" />
                </div>
                <div className="ro-tip-ad">{t.etiket}</div>
                <div className="ro-tip-aciklama">{t.aciklama}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="ro-form-grid">
          {raporTuru.kapsam !== "global" && (
            <div className="ro-field">
              <label>Müşteri</label>
              <select value={musteriId} onChange={(e) => musteriDegistir(e.target.value)}>
                <option value="">Seçin</option>
                {musteriler.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ad}
                  </option>
                ))}
              </select>
            </div>
          )}
          {raporTuru.kapsam === "global" && (
            <div className="ro-field">
              <label>Müşteri (opsiyonel)</label>
              <select value={musteriId} onChange={(e) => musteriDegistir(e.target.value)}>
                <option value="">Tüm müşteriler</option>
                {musteriler.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ad}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(raporTuru.kapsam === "parsel" || raporTuru.parselCokluSecim) && (
            <div className="ro-field">
              <label>{raporTuru.parselCokluSecim ? "Parsel(ler) (boş = tümü)" : "Parsel"}</label>
              {parselSecenekleri.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "9px 2px" }}>Önce müşteri seçin.</div>
              ) : (
                <div className="parsel-secim">
                  {parselSecenekleri.map((p) => (
                    <label key={p.id} className={parselIds.has(p.id) ? "secili" : ""}>
                      <input type={raporTuru.parselCokluSecim ? "checkbox" : "radio"} checked={parselIds.has(p.id)} onChange={() => parselToggle(p.id)} />
                      {p.ad}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {tarihAraligiGerekliMi(raporTuru.kapsamModu) && (
            <>
              <div className="ro-field">
                <label>Başlangıç Tarihi</label>
                <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
              </div>
              <div className="ro-field">
                <label>Bitiş Tarihi</label>
                <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
              </div>
            </>
          )}

          {(raporTuru.kapsamModu === "yil" || raporTuru.kapsamModu === "donem-urun-filtresi") && (
            <div className="ro-field">
              <label>Yıl</label>
              <input type="number" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
            </div>
          )}

          {raporTuru.kapsamModu === "donem-urun-filtresi" && (
            <>
              <div className="ro-field">
                <label>Dönem (boş = tümü)</label>
                <div className="parsel-secim">
                  {donemSecenekleri.map((d) => (
                    <label key={d.index} className={secilenDonemler.has(d.index) ? "secili" : ""} title={d.baslik}>
                      <input
                        type="checkbox"
                        checked={secilenDonemler.has(d.index)}
                        onChange={() =>
                          setSecilenDonemler((onceki) => {
                            const yeni = new Set(onceki);
                            if (yeni.has(d.index)) yeni.delete(d.index);
                            else yeni.add(d.index);
                            return yeni;
                          })
                        }
                      />
                      {d.baslik.length > 22 ? `${d.baslik.slice(0, 21)}…` : d.baslik}
                    </label>
                  ))}
                </div>
              </div>
              <div className="ro-field">
                <label>Ürün (boş = tümü)</label>
                <div className="parsel-secim">
                  {urunSecenekleri.map((ad) => (
                    <label key={ad} className={secilenUrunler.has(ad) ? "secili" : ""}>
                      <input
                        type="checkbox"
                        checked={secilenUrunler.has(ad)}
                        onChange={() =>
                          setSecilenUrunler((onceki) => {
                            const yeni = new Set(onceki);
                            if (yeni.has(ad)) yeni.delete(ad);
                            else yeni.add(ad);
                            return yeni;
                          })
                        }
                      />
                      {ad}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="ro-actions">
          <div className="ro-eposta-grup">
            <div className="ro-eposta-satir">
              <input
                type="email"
                placeholder="ornek@sirket.com"
                value={epostaAdresi}
                onChange={(e) => setEpostaAdresi(e.target.value)}
                disabled={epostaGonderiliyor}
              />
              <button
                type="button"
                className="btn"
                onClick={epostaylaGonder}
                disabled={epostaGonderiliyor || sayfalar.length === 0 || !epostaAdresi}
              >
                {epostaGonderiliyor ? "Gönderiliyor…" : "E-posta ile Gönder"}
              </button>
            </div>
            {epostaDurumu && (
              <div className={`ro-eposta-durum${epostaDurumu.basarili ? " basarili" : " hata"}`}>{epostaDurumu.mesaj}</div>
            )}
          </div>
          <DisaAktarButton
            dosyaAdi={dosyaAdiTabani || "Rapor"}
            belgeBasligi={`${secilenMusteri?.ad ?? "Ortatepeler"} — ${raporTuru.etiket}`}
            tablolariGetir={() => {
              const toplananSayfalar = raporSayfalariniTopla(onizlemeRef.current);
              const cokSayfali = toplananSayfalar.length > 1;
              return toplananSayfalar.flatMap((s, sayfaIndex) =>
                s.bolumler
                  // Veri girilmemiş (bosMesaj'lı, tablosuz) bölümler Excel'de boş bir
                  // sayfa açmaz — ham veri ilkesi gereği sadece gerçek tablolar aktarılır.
                  .filter((b): b is typeof b & { tablo: HTMLTableElement } => !!b.tablo)
                  .map((b) => ({
                    // Haftalık Rapor gibi çok sayfalı (her hafta ayrı sayfa) türlerde
                    // her sayfanın aynı isimli bölümü (ör. "İklim") olabildiği için
                    // sayfa numarası önekiyle ayrıştırılır — aksi halde Excel sayfa
                    // adı çakışması (ExcelJS aynı worksheet adını iki kez kabul etmez).
                    baslik: (cokSayfali ? `${sayfaIndex + 1}. ${b.baslik}` : `${s.baslik} — ${b.baslik}`).slice(0, 110),
                    eleman: b.tablo,
                    sabitSutunSayisi: b.sabitSutunSayisi,
                  })),
              );
            }}
            antetliPdfGetir={() => {
              const toplananSayfalar = raporSayfalariniTopla(onizlemeRef.current);
              if (toplananSayfalar.length === 0) return null;
              return { sayfalar: toplananSayfalar, olusturulmaZamani: olusturulmaZamani || new Date().toISOString() };
            }}
          />
        </div>
      </div>

      <div className="card ro-onizleme-panel">
        <h4>Önizleme</h4>
        {!kapsamGecerli ? (
          <div className="ro-onizleme-durum">Formu doldurunca önizleme burada görünür.</div>
        ) : sayfalar.length === 0 ? (
          <div className="ro-onizleme-durum">{isPending ? "Yükleniyor…" : hata ? hata : "Bu seçimle veri bulunamadı."}</div>
        ) : (
          <button
            type="button"
            className={`ro-onizleme-sayfalar ro-onizleme-buyut-tetik${isPending ? " ro-yukleniyor" : ""}`}
            onClick={() => setBuyukGorunum(true)}
            aria-label="Önizlemeyi büyüt"
          >
            <div className="rapor-sayfa-cerceve" ref={onizlemeRef}>
              {sayfalar.map((sayfa, i) => (
                <RaporAntetSayfasi
                  key={i}
                  eyebrow={sayfa.eyebrow}
                  baslik={sayfa.baslik}
                  altBaslik={sayfa.altBaslik}
                  metaSatirlari={sayfa.metaSatirlari}
                  olusturulmaZamani={olusturulmaZamani}
                  sayfaNo={sayfalar.length > 1 ? { mevcut: i + 1, toplam: sayfalar.length } : undefined}
                >
                  {sayfa.icerik}
                </RaporAntetSayfasi>
              ))}
            </div>
            <div className="ro-onizleme-buyut-ipucu">
              <Icon name="search" className="icon" />
              Büyüt
            </div>
          </button>
        )}
      </div>

      {buyukGorunum && (
        <div className="ro-lightbox-overlay" onClick={() => setBuyukGorunum(false)}>
          <div className="ro-lightbox-ust">
            <span>
              {raporTuru.etiket} önizlemesi{sayfalar.length > 1 ? ` — ${sayfalar.length} sayfa` : ""}
            </span>
            <button type="button" className="ro-lightbox-kapat" onClick={() => setBuyukGorunum(false)} aria-label="Kapat">
              <Icon name="plus" />
            </button>
          </div>
          <div className="ro-lightbox-govde" onClick={(e) => e.stopPropagation()}>
            <div className="rapor-sayfa-cerceve">
              {sayfalar.map((sayfa, i) => (
                <RaporAntetSayfasi
                  key={i}
                  eyebrow={sayfa.eyebrow}
                  baslik={sayfa.baslik}
                  altBaslik={sayfa.altBaslik}
                  metaSatirlari={sayfa.metaSatirlari}
                  olusturulmaZamani={olusturulmaZamani}
                  sayfaNo={sayfalar.length > 1 ? { mevcut: i + 1, toplam: sayfalar.length } : undefined}
                >
                  {sayfa.icerik}
                </RaporAntetSayfasi>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------
// Tür bazlı sayfa üretimi — her rapor türü kendi antetli sayfa/sayfalarını
// (eyebrow/başlık/altbaşlık/meta + .govde-bolum içerikleri) üretir. Tablolar
// SALT OKUNUR (input yok) — bu bir rapor, veri girişi değil.
// ------------------------------------------------------------------------

function sayfalariUret(
  veri: RaporGorunumVerisi,
  ctx: { secilenDonemler: Set<number>; secilenUrunler: Set<string> },
): OnizlemeSayfasi[] {
  switch (veri.tur) {
    case "haftalik":
      return veri.haftalar.map(({ haftaBaslangic, haftaBitis, veri: hv }) => ({
        eyebrow: "Haftalık Rapor",
        baslik: veri.customerAdi,
        altBaslik: `${formatUzunTarih(haftaBaslangic)} – ${formatUzunTarih(haftaBitis)} dönemi saha faaliyet dökümü`,
        metaSatirlari: [{ k: "Dönem", v: `${formatKisaTarih(haftaBaslangic)} – ${formatKisaTarih(haftaBitis)}` }],
        icerik: <HaftalikRaporIcerik veri={hv} />,
      }));

    case "ozet":
      return [
        {
          eyebrow: "Özet Rapor",
          baslik: veri.customerAdi,
          altBaslik: veri.haftalar.length > 0 ? `${formatUzunTarih(veri.haftalar[0]!.haftaBaslangic)} – ${formatUzunTarih(veri.haftalar[veri.haftalar.length - 1]!.haftaBitis)} arası haftalık özet` : "Haftalık özet",
          metaSatirlari: [{ k: "Hafta Sayısı", v: String(veri.haftalar.length) }],
          icerik: <OzetIcerik haftalar={veri.haftalar} />,
        },
      ];

    case "gunluk-saha":
      return [
        {
          eyebrow: "Günlük Saha Kaydı",
          baslik: veri.customerAdi,
          altBaslik: "Seçili tarih aralığındaki parsel bazlı saha kayıtları",
          metaSatirlari: [],
          icerik: <GunlukSahaIcerik satirlar={veri.satirlar} />,
        },
      ];

    case "ygp": {
      const gorunurGruplar: { di: number; ui: number; donem: (typeof YAPRAK_GUBRELEME_PLANI)[number]; urun: (typeof YAPRAK_GUBRELEME_PLANI)[number]["urunler"][number] }[] = [];
      YAPRAK_GUBRELEME_PLANI.forEach((donem, di) => {
        if (ctx.secilenDonemler.size > 0 && !ctx.secilenDonemler.has(di)) return;
        donem.urunler.forEach((urun, ui) => {
          if (ctx.secilenUrunler.size > 0 && !ctx.secilenUrunler.has(urun.ad)) return;
          gorunurGruplar.push({ di, ui, donem, urun });
        });
      });
      return [
        {
          eyebrow: "Yaprak Gübreleme Planı",
          baslik: veri.customerAdi,
          altBaslik: `${veri.yil} sezonu — tüm parseller`,
          metaSatirlari: [],
          icerik: <YgpIcerik parcels={veri.parcels} degerlerByParcel={veri.degerlerByParcel} gorunurGruplar={gorunurGruplar} />,
        },
      ];
    }

    case "sulama-uyumu":
      return [
        {
          eyebrow: "Sulama Uyumu",
          baslik: veri.musteriAdi,
          altBaslik: `${veri.parcel.ad} parseli — seçili tarih aralığıyla kesişen sulama planları`,
          metaSatirlari: [{ k: "Plan Sayısı", v: String(veri.planGorunumleri.length) }],
          icerik: <SulamaUyumuIcerik planGorunumleri={veri.planGorunumleri} />,
        },
      ];

    case "gelir-gider": {
      const toplamGelir = veri.kayitlar.filter((k) => k.tur === "gelir").reduce((s, k) => s + k.tutar, 0);
      const toplamGider = veri.kayitlar.filter((k) => k.tur === "gider").reduce((s, k) => s + k.tutar, 0);
      return [
        {
          eyebrow: "Gelir Gider",
          baslik: "Gelir Gider Dökümü",
          altBaslik: "Seçili tarih aralığının gelir/gider kayıtları",
          metaSatirlari: [
            { k: "Toplam Gelir", v: `₺${toplamGelir.toLocaleString("tr-TR")}` },
            { k: "Toplam Gider", v: `₺${toplamGider.toLocaleString("tr-TR")}` },
            { k: "Net", v: `₺${(toplamGelir - toplamGider).toLocaleString("tr-TR")}` },
          ],
          icerik: <GelirGiderIcerik kayitlar={veri.kayitlar} musteriMap={veri.musteriMap} />,
        },
      ];
    }

    case "beslenme":
      return [
        {
          eyebrow: "Beslenme (Damlama Gübre)",
          baslik: veri.musteriAdi,
          altBaslik: `${veri.parcel.ad} parseli — sezon planı ve seçili tarih aralığındaki uygulamalar`,
          metaSatirlari: [],
          icerik: <BeslenmeIcerik planGorunumleri={veri.planGorunumleri} uygulamalar={veri.uygulamalar} />,
        },
      ];

    case "fertigasyon":
      return [
        {
          eyebrow: "Fertigasyon",
          baslik: veri.musteriAdi,
          altBaslik: `${veri.parcel.ad} parseli — seçili tarih aralığındaki fertigasyon kayıtları`,
          metaSatirlari: [{ k: "Kayıt Sayısı", v: String(veri.kayitGorunumleri.length) }],
          icerik: <FertigasyonIcerik kayitGorunumleri={veri.kayitGorunumleri} />,
        },
      ];

    case "ziyaret":
      return [
        {
          eyebrow: "Ziyaret Kaydı",
          baslik: veri.customerAdi,
          altBaslik: "Seçili tarih aralığındaki tüm saha kayıtları",
          metaSatirlari: [{ k: "Kayıt Sayısı", v: String(veri.kayitlar.length) }],
          icerik: <ZiyaretIcerik kayitlar={veri.kayitlar} parcelAdMap={veri.parcelAdMap} recordTypeMap={veri.recordTypeMap} />,
        },
      ];

    case "degerlendirme":
      return [
        {
          eyebrow: "Genel Değerlendirme",
          baslik: veri.musteriAdi,
          altBaslik: `${veri.parcel.ad} parseli — ${veri.yil} değerlendirmesi`,
          metaSatirlari: [],
          icerik: <DegerlendirmeIcerik sorular={veri.sorular} degerlendirme={veri.degerlendirme} />,
        },
      ];
  }
}

function BosNot({ children }: { children: React.ReactNode }) {
  return <p className="rapor-bos-not">{children}</p>;
}

function HaftalikRaporIcerik({ veri }: { veri: import("@/lib/haftalikRapor").HaftalikRaporVerisi }) {
  const TREND_SATIRLARI: { key: "sulamaSaat" | "gubreUygulama" | "yaprakGubresi" | "ilacUygulama" | "sahaTespiti"; label: string; birim: string }[] = [
    { key: "sulamaSaat", label: "Sulama", birim: " sa" },
    { key: "gubreUygulama", label: "Gübreleme", birim: " uygulama" },
    { key: "yaprakGubresi", label: "Yaprak Gübresi", birim: " uygulama" },
    { key: "ilacUygulama", label: "İlaçlama", birim: " uygulama" },
    { key: "sahaTespiti", label: "Saha Tespiti", birim: " görev" },
  ];
  return (
    <>
      <div className="govde-bolum">
        <div className="govde-bolum-baslik">Isı Toplamı / İklim</div>
        {veri.parselIklim.length === 0 ? (
          <BosNot>Seçili parseller için topraq.ai hava verisi yok.</BosNot>
        ) : (
          <table className="rapor-tablo">
            <thead>
              <tr>
                <th>Parsel</th>
                <th>Ort. Sıcaklık</th>
                <th>Haftalık GDD</th>
                <th>Kümülatif GDD</th>
              </tr>
            </thead>
            <tbody>
              {veri.parselIklim.map((p) => (
                <tr key={p.parcelId}>
                  <td>{p.ad}</td>
                  <td className="num">{p.ortSicaklik !== null ? `${sayiFormat(p.ortSicaklik)}°C` : "—"}</td>
                  <td className="num">{sayiFormat(p.haftalikGdd)}</td>
                  <td className="num">{sayiFormat(p.kumulatifGdd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {[
        { baslik: "Toprak Gübreleme", satirlar: veri.gubreSatirlari },
        { baslik: "Yaprak Gübresi", satirlar: veri.yaprakSatirlari },
        { baslik: "İlaçlama", satirlar: veri.ilacSatirlari },
      ].map(({ baslik, satirlar }) => (
        <div className="govde-bolum" key={baslik}>
          <div className="govde-bolum-baslik">{baslik}</div>
          {satirlar.length === 0 ? (
            <BosNot>Bu hafta {baslik.toLocaleLowerCase("tr-TR")} kaydı girilmedi.</BosNot>
          ) : (
            <table className="rapor-tablo">
              <thead>
                <tr>
                  <th>Parsel</th>
                  <th>Tarih</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.flatMap((satir) =>
                  satir.kayitlar.map((kayit) => (
                    <tr key={kayit.id}>
                      <td>{satir.parcelAdi}</td>
                      <td>{formatKisaTarih(kayit.tarih)}</td>
                      <td>{kayitDegerOzeti(kayit)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <div className="govde-bolum">
        <div className="govde-bolum-baslik">Sulama</div>
        {veri.sulamaIzgaralari.length === 0 ? (
          <BosNot>Bu hafta sulama kaydı girilmedi.</BosNot>
        ) : (
          <table className="rapor-tablo">
            <thead>
              <tr>
                <th>Parsel</th>
                {veri.sulamaIzgaralari[0]!.gunSaatleri.map((g) => (
                  <th key={g.tarih}>{g.gun}</th>
                ))}
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {veri.sulamaIzgaralari.map((izgara) => (
                <tr key={izgara.parcelId}>
                  <td>{izgara.parcelAdi}</td>
                  {izgara.gunSaatleri.map((g) => (
                    <td className="num" key={g.tarih}>
                      {g.saat > 0 ? sayiFormat(g.saat, " sa") : "—"}
                    </td>
                  ))}
                  <td className="num">{sayiFormat(izgara.toplamSaat, " sa")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="govde-bolum">
        <div className="govde-bolum-baslik">Parsel Gezisi / Gözlemler</div>
        {veri.gozlemSatirlari.length === 0 ? (
          <BosNot>Bu hafta gözlem/ziyaret notu girilmedi.</BosNot>
        ) : (
          <table className="rapor-tablo">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Parsel</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {veri.gozlemSatirlari.map((g, i) => (
                <tr key={i}>
                  <td>{formatKisaTarih(g.tarih)}</td>
                  <td>{g.parcelAdi}</td>
                  <td>{g.not}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="govde-bolum">
        <div className="govde-bolum-baslik">Bu Hafta – Geçen Hafta</div>
        <table className="rapor-tablo">
          <thead>
            <tr>
              <th>Ölçüt</th>
              <th>Geçen Hafta</th>
              <th>Bu Hafta</th>
            </tr>
          </thead>
          <tbody>
            {TREND_SATIRLARI.map(({ key, label, birim }) => (
              <tr key={key}>
                <td>{label}</td>
                <td className="num">
                  {veri.gecenHafta[key]}
                  {birim}
                </td>
                <td className="num">
                  {veri.buHafta[key]}
                  {birim}
                </td>
              </tr>
            ))}
            <tr>
              <td>Haftalık GDD</td>
              <td className="num">{sayiFormat(veri.gecenHafta.haftalikGdd)}</td>
              <td className="num">{sayiFormat(veri.buHafta.haftalikGdd)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function OzetIcerik({ haftalar }: { haftalar: import("@/lib/haftalikRapor").HaftaOzeti[] }) {
  return (
    <div className="govde-bolum">
      <div className="govde-bolum-baslik">Haftalık Özet</div>
      <table className="rapor-tablo">
        <thead>
          <tr>
            <th>Hafta</th>
            <th>Ort. Sıcaklık</th>
            <th>Haftalık GDD</th>
            <th>Kümülatif GDD</th>
            <th>Sulama</th>
            <th>Gübreleme</th>
            <th>Yaprak Gübresi</th>
            <th>İlaçlama</th>
            <th>Saha Tespiti</th>
          </tr>
        </thead>
        <tbody>
          {haftalar.map((h) => (
            <tr key={h.haftaBaslangic}>
              <td>
                {formatKisaTarih(h.haftaBaslangic)} – {formatKisaTarih(h.haftaBitis)}
              </td>
              <td className="num">{h.ortSicaklik !== null ? `${sayiFormat(h.ortSicaklik)}°C` : "—"}</td>
              <td className="num">{sayiFormat(h.haftalikGdd)}</td>
              <td className="num">{sayiFormat(h.kumulatifGdd)}</td>
              <td className="num">{h.sulamaSaat > 0 ? sayiFormat(h.sulamaSaat, " sa") : "—"}</td>
              <td className="num">{h.gubreUygulama}</td>
              <td className="num">{h.yaprakGubresi}</td>
              <td className="num">{h.ilacUygulama}</td>
              <td className="num">{h.sahaTespiti}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GunlukSahaIcerik({
  satirlar,
}: {
  satirlar: { tarih: string; no: number; parcelAdi: string; durum: string; gozlem: string; recete: string; donem: string; oncelikPuani: number | null }[];
}) {
  if (satirlar.length === 0) return <BosNot>Seçili tarih aralığında hiçbir parselde kayıt girilmemiş.</BosNot>;
  return (
    <div className="govde-bolum">
      <div className="govde-bolum-baslik">Saha Kayıtları</div>
      <table className="rapor-tablo">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Parsel</th>
            <th>Durum</th>
            <th>Gözlem</th>
            <th>Reçete</th>
            <th>Dönem</th>
            <th>Öncelik</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s) => {
            const d = durumPill(s.durum);
            return (
              <tr key={`${s.tarih}-${s.no}`}>
                <td>{formatKisaTarih(s.tarih)}</td>
                <td>{s.parcelAdi}</td>
                <td>{d.sinif ? <span className={`pill ${d.sinif}`}>{d.etiket}</span> : d.etiket}</td>
                <td>{s.gozlem || "—"}</td>
                <td>{s.recete || "—"}</td>
                <td>{s.donem || "—"}</td>
                <td className="num">
                  {s.oncelikPuani != null ? <span className={`pill ${oncelikSinifi(s.oncelikPuani) === "yuksek" ? "crit" : oncelikSinifi(s.oncelikPuani) === "orta" ? "amber" : "good"}`}>{s.oncelikPuani}</span> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function YgpIcerik({
  parcels,
  degerlerByParcel,
  gorunurGruplar,
}: {
  parcels: import("@/types").Parcel[];
  degerlerByParcel: Record<string, Record<string, number>>;
  gorunurGruplar: { di: number; ui: number; donem: (typeof YAPRAK_GUBRELEME_PLANI)[number]; urun: (typeof YAPRAK_GUBRELEME_PLANI)[number]["urunler"][number] }[];
}) {
  if (parcels.length === 0) return <BosNot>Bu müşterinin henüz parseli yok.</BosNot>;
  if (gorunurGruplar.length === 0) return <BosNot>Filtreyle eşleşen ürün yok.</BosNot>;
  return (
    <div className="govde-bolum" data-sabit-sutun="5">
      <div className="govde-bolum-baslik">Yaprak Gübreleme Planı</div>
      <div style={{ overflowX: "auto" }}>
        <table className="rapor-tablo">
          <thead>
            <tr>
              <th>No</th>
              <th>Block No</th>
              <th>Ürün &amp; Çeşit</th>
              <th>Ha</th>
              <th>Ağaç/Ha</th>
              {gorunurGruplar.flatMap(({ di, ui, urun }) => urun.kolonlar.map((_, ki) => <th key={`${di}-${ui}-${ki}`}>{urun.ad}</th>))}
            </tr>
            <tr>
              <th />
              <th />
              <th />
              <th />
              <th />
              {gorunurGruplar.flatMap(({ di, ui, urun }) => urun.kolonlar.map((kolon, ki) => <th key={`${di}-${ui}-${ki}`}>{kolon.etiket}</th>))}
            </tr>
          </thead>
          <tbody>
            {parcels.map((parcel, index) => {
              const meta = ygpMetaHesapla(parcel);
              const degerler = degerlerByParcel[parcel.id] ?? {};
              return (
                <tr key={parcel.id}>
                  <td>
                    {index + 1} {parcel.ad}
                  </td>
                  <td>{parcel.blockNo}</td>
                  <td>{meta.cultivar}</td>
                  <td className="num">{meta.ha.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</td>
                  <td className="num">{meta.treesPerHa ?? "—"}</td>
                  {gorunurGruplar.flatMap(({ di, ui, urun }) =>
                    urun.kolonlar.map((_, ki) => (
                      <td className="num" key={`${di}-${ui}-${ki}`}>
                        {degerler[ygpAnahtar(di, ui, ki)] ?? 0}
                      </td>
                    )),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SulamaUyumuIcerik({
  planGorunumleri,
}: {
  planGorunumleri: { plan: import("@/types").SulamaPlani; gunler: import("@/lib/sulamaUyumu").SulamaGunSonucu[] }[];
}) {
  if (planGorunumleri.length === 0) return <BosNot>Seçili tarih aralığıyla kesişen sulama planı yok.</BosNot>;
  return (
    <>
      {planGorunumleri.map(({ plan, gunler }) => {
        const tamGun = gunler.filter((g) => g.puan === 1).length;
        const kacirilan = gunler.filter((g) => g.puan === 0).length;
        return (
          <div className="govde-bolum" key={plan.id}>
            <div className="govde-bolum-baslik">
              {formatKayitTarihi(plan.donemBaslangic)} – {formatKayitTarihi(plan.donemBitis)}
              {plan.gundeKacDefa != null && plan.gundeKacSaat != null ? ` · Günde ${plan.gundeKacDefa} kez, ${plan.gundeKacSaat} saat` : ""}
            </div>
            {gunler.length === 0 ? (
              <BosNot>Seçili aralıkta bu plana ait gün yok.</BosNot>
            ) : (
              <table className="rapor-tablo">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {gunler.map((g) => (
                    <tr key={g.tarih}>
                      <td>{formatKisaTarih(g.tarih)}</td>
                      <td>
                        {g.puan === 1 ? <span className="pill good">Tam Uygulanmış</span> : g.puan === 0.8 ? <span className="pill amber">±1 Gün</span> : <span className="pill crit">Kaçırılmış</span>}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Toplam</strong>
                    </td>
                    <td className="num">
                      {tamGun} tam · {kacirilan} kaçırılmış
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </>
  );
}

function GelirGiderIcerik({ kayitlar, musteriMap }: { kayitlar: import("@/types").GelirGiderKaydi[]; musteriMap: Record<string, string> }) {
  if (kayitlar.length === 0) return <BosNot>Seçili tarih aralığında gelir/gider kaydı yok.</BosNot>;
  return (
    <div className="govde-bolum">
      <div className="govde-bolum-baslik">Kayıtlar</div>
      <table className="rapor-tablo">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Tür</th>
            <th>Kategori</th>
            <th>Açıklama</th>
            <th>Müşteri</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {kayitlar.map((k) => (
            <tr key={k.id}>
              <td>{formatKisaTarih(k.tarih)}</td>
              <td>{k.tur === "gelir" ? <span className="pill good">Gelir</span> : <span className="pill crit">Gider</span>}</td>
              <td>{k.kategori}</td>
              <td>{k.aciklama || "—"}</td>
              <td>{k.customerId ? (musteriMap[k.customerId] ?? "—") : "—"}</td>
              <td className="num">₺{k.tutar.toLocaleString("tr-TR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BeslenmeIcerik({
  planGorunumleri,
  uygulamalar,
}: {
  planGorunumleri: { plan: import("@/types").BeslenmePlani; sonuc: import("@/lib/beslenme").BeslenmeSonucu }[];
  uygulamalar: import("@/types").BeslenmeUygulamaKaydi[];
}) {
  return (
    <>
      <div className="govde-bolum">
        <div className="govde-bolum-baslik">Sezon Planı</div>
        {planGorunumleri.length === 0 ? (
          <BosNot>Bu parsel için sezon planı tanımlanmamış.</BosNot>
        ) : (
          planGorunumleri.map(({ plan, sonuc }) => (
            <table className="rapor-tablo" key={plan.id} style={{ marginBottom: 10 }}>
              <thead>
                <tr>
                  <th>Sezon {plan.sezon}</th>
                  <th>Dönem</th>
                  <th>Ürün</th>
                  <th>Doz / Ağaç</th>
                  <th>Toplam ({">"} parsel)</th>
                </tr>
              </thead>
              <tbody>
                {sonuc.satirlar.map((s) => (
                  <tr key={s.id}>
                    <td />
                    <td>{s.donem}</td>
                    <td>{s.urun}</td>
                    <td className="num">
                      {sayiFormat(s.dozAgac)} {s.birim}
                    </td>
                    <td className="num">
                      {sayiFormat(sonuc.toplamUrunParsel[s.urun] ?? null)} {URUN_BIRIM_PARSEL[s.urun]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}
      </div>
      <div className="govde-bolum">
        <div className="govde-bolum-baslik">Gerçekleşen Uygulamalar</div>
        {uygulamalar.length === 0 ? (
          <BosNot>Seçili tarih aralığında uygulama kaydı yok.</BosNot>
        ) : (
          <table className="rapor-tablo">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Ürün</th>
                <th>Miktar (kg)</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {uygulamalar.map((u) => (
                <tr key={u.id}>
                  <td>{formatKisaTarih(u.tarih)}</td>
                  <td>{u.urun}</td>
                  <td className="num">{sayiFormat(u.miktarKg)}</td>
                  <td>{u.not || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function FertigasyonIcerik({
  kayitGorunumleri,
}: {
  kayitGorunumleri: { kayit: import("@/types").FertigasyonKaydi; sonuc: import("@/lib/fertigasyon").FertigasyonSonucu }[];
}) {
  if (kayitGorunumleri.length === 0) return <BosNot>Seçili tarih aralığında fertigasyon kaydı yok.</BosNot>;
  return (
    <div className="govde-bolum">
      <div className="govde-bolum-baslik">Fertigasyon Kayıtları</div>
      <table className="rapor-tablo">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Ürün</th>
            <th>Vana</th>
            <th>Ağaç Sayısı</th>
            <th>Doz / Ağaç</th>
            <th>Toplam İhtiyaç</th>
            <th>{"Ambalaj Sayısı"}</th>
          </tr>
        </thead>
        <tbody>
          {kayitGorunumleri.map(({ kayit, sonuc }) => (
            <tr key={kayit.id}>
              <td>{formatKisaTarih(kayit.tarih)}</td>
              <td>{kayit.urun}</td>
              <td>{kayit.vanaAdi || "—"}</td>
              <td className="num">{kayit.agacSayisi}</td>
              <td className="num">
                {kayit.dozAgac} {FERTIGASYON_BIRIM[kayit.urun].doz}
              </td>
              <td className="num">
                {sayiFormat(sonuc.toplamIhtiyac)} {FERTIGASYON_BIRIM[kayit.urun].ambalaj}
              </td>
              <td className="num">
                {sayiFormat(sonuc.ambalajSayisi)} {FERTIGASYON_BIRIM[kayit.urun].ambalajAdi}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ZiyaretIcerik({
  kayitlar,
  parcelAdMap,
  recordTypeMap,
}: {
  kayitlar: FieldRecord[];
  parcelAdMap: Record<string, string>;
  recordTypeMap: Record<string, import("@/types").RecordTypeDef>;
}) {
  if (kayitlar.length === 0) return <BosNot>Seçili tarih aralığında saha kaydı yok.</BosNot>;
  return (
    <div className="govde-bolum">
      <div className="govde-bolum-baslik">Saha Kayıtları</div>
      <table className="rapor-tablo">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Parsel</th>
            <th>Tip</th>
            <th>Özet</th>
            <th>Not</th>
          </tr>
        </thead>
        <tbody>
          {kayitlar.map((k) => {
            const tip = recordTypeMap[k.recordTypeId];
            return (
              <tr key={k.id}>
                <td>{formatKayitTarihi(k.tarih)}</td>
                <td>{parcelAdMap[k.parcelId] ?? "—"}</td>
                <td>
                  <span className={`tip-badge ${tip ? tipBadgeSinifi(tip.ad) : "tip-gozlem"}`}>{tip?.ad ?? "Kayıt"}</span>
                </td>
                <td>{kayitOzeti(tip, k)}</td>
                <td>{k.not || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DegerlendirmeIcerik({
  sorular,
  degerlendirme,
}: {
  sorular: import("@/types").DegerlendirmeSorusu[];
  degerlendirme: import("@/types").ParselDegerlendirmesi | null;
}) {
  if (sorular.length === 0) return <BosNot>Henüz değerlendirme sorusu tanımlanmadı.</BosNot>;
  return (
    <div className="govde-bolum">
      <div className="govde-bolum-baslik">Genel Değerlendirme</div>
      <table className="rapor-tablo">
        <thead>
          <tr>
            <th>Soru</th>
            <th>Puan</th>
            <th>Not</th>
          </tr>
        </thead>
        <tbody>
          {sorular.map((soru) => {
            const cevap = degerlendirme?.cevaplar.find((c) => c.soruId === soru.id);
            return (
              <tr key={soru.id}>
                <td>{soru.soru}</td>
                <td className="num">{cevap ? `${cevap.puan} / 5` : "—"}</td>
                <td>{cevap?.not || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
