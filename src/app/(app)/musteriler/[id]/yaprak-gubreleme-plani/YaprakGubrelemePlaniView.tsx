"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/NotificationsProvider";
import { DisaAktarButton } from "@/components/DisaAktarButton";
import { saveYaprakGubrelemePlaniAction } from "@/lib/actions";
import { YAPRAK_GUBRELEME_PLANI, ygpAnahtar, ygpMetaHesapla } from "@/lib/yaprakGubrelemePlani";
import type { Customer, Parcel, YaprakGubrelemePlani } from "@/types";

// Parsel Detayı → Uygulamalar → "Plan Ekle" hangi parselden tıklanırsa
// tıklansın BURAYA düşer — Excel'deki gerçek yapıyla birebir: müşterinin TÜM
// parselleri aynı tabloda satır satır (bkz. sayfa.tsx). Dönem/ürün filtresi
// 105 alanda gezinmeyi kolaylaştırmak için sütun gruplarını gizler/gösterir.
function degerleriStringMapineDonustur(plan: YaprakGubrelemePlani | undefined): Record<string, string> {
  if (!plan) return {};
  const sonuc: Record<string, string> = {};
  for (const [anahtar, deger] of Object.entries(plan.degerler)) {
    sonuc[anahtar] = String(deger);
  }
  return sonuc;
}

// Dönem/Ürün filtresi — checkbox listesi bir dropdown panelinde, chip
// sırası yerine tek satırlık bir buton olarak açılır/kapanır (önceki sürümde
// 15 dönem + 12 ürün chip'i sayfayı çok kalabalık gösteriyordu).
function FiltreDropdown<T extends string | number>({
  etiket,
  secenekler,
  secili,
  onDegistir,
}: {
  etiket: string;
  secenekler: { deger: T; ad: string }[];
  secili: Set<T>;
  onDegistir: (deger: T) => void;
}) {
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    function disariTiklandi(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disariTiklandi);
    return () => document.removeEventListener("mousedown", disariTiklandi);
  }, [acik]);

  const buttonEtiket = secili.size === 0 ? `${etiket}: Tümü` : `${etiket}: ${secili.size} seçili`;

  return (
    <div className="dropdown" ref={kutuRef}>
      <button type="button" className={`dropdown-btn${secili.size > 0 ? " dropdown-btn-aktif" : ""}`} onClick={() => setAcik((a) => !a)}>
        {buttonEtiket}
      </button>
      {acik && (
        <div className="dropdown-panel">
          {secili.size > 0 && (
            <button type="button" className="dropdown-temizle" onClick={() => secenekler.forEach((s) => secili.has(s.deger) && onDegistir(s.deger))}>
              Temizle
            </button>
          )}
          {secenekler.map((s) => (
            <label key={s.deger} className="dropdown-secenek">
              <input type="checkbox" checked={secili.has(s.deger)} onChange={() => onDegistir(s.deger)} />
              {s.ad}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function YaprakGubrelemePlaniView({
  customer,
  parcels,
  secilenYil,
  planlar,
  kayitliYillar,
  vurgulananParcelId,
}: {
  customer: Customer;
  parcels: Parcel[];
  secilenYil: number;
  planlar: YaprakGubrelemePlani[];
  kayitliYillar: number[];
  vurgulananParcelId: string | null;
}) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [isPending, startTransition] = useTransition();

  const planByParcelId = useMemo(() => new Map(planlar.map((p) => [p.parcelId, p])), [planlar]);
  const [degerlerByParcel, setDegerlerByParcel] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(parcels.map((p) => [p.id, degerleriStringMapineDonustur(planByParcelId.get(p.id))])),
  );

  const [secilenDonemler, setSecilenDonemler] = useState<Set<number>>(new Set());
  const [secilenUrunler, setSecilenUrunler] = useState<Set<string>>(new Set());

  const vurgulananSatirRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    vurgulananSatirRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const tabloRef = useRef<HTMLTableElement>(null);

  const yilSecenekleri = useMemo(() => {
    const bugunYil = new Date().getFullYear();
    const set = new Set<number>([bugunYil, bugunYil - 1, bugunYil - 2, secilenYil, ...kayitliYillar]);
    return Array.from(set).sort((a, b) => b - a);
  }, [secilenYil, kayitliYillar]);

  // Filtre seçenekleri — dönem listesi şablon sırasıyla, ürün listesi ilk
  // göründüğü sırayla tekrarsız.
  const donemSecenekleri = useMemo(() => YAPRAK_GUBRELEME_PLANI.map((d, i) => ({ index: i, baslik: d.baslik })), []);
  const urunSecenekleri = useMemo(() => {
    const gorulen = new Set<string>();
    const liste: string[] = [];
    YAPRAK_GUBRELEME_PLANI.forEach((d) =>
      d.urunler.forEach((u) => {
        if (!gorulen.has(u.ad)) {
          gorulen.add(u.ad);
          liste.push(u.ad);
        }
      }),
    );
    return liste;
  }, []);

  // Filtreye göre görünür ürün sütun-grupları — dönem VE ürün filtresi
  // birlikte seçiliyse KESİŞİM uygulanır (ör. "Nisan dönemi" + "bortechin"
  // seçilirse sadece o ikisinin kesiştiği grup görünür).
  const gorunurGruplar = useMemo(() => {
    const gruplar: { di: number; ui: number; donem: (typeof YAPRAK_GUBRELEME_PLANI)[number]; urun: (typeof YAPRAK_GUBRELEME_PLANI)[number]["urunler"][number] }[] = [];
    YAPRAK_GUBRELEME_PLANI.forEach((donem, di) => {
      if (secilenDonemler.size > 0 && !secilenDonemler.has(di)) return;
      donem.urunler.forEach((urun, ui) => {
        if (secilenUrunler.size > 0 && !secilenUrunler.has(urun.ad)) return;
        gruplar.push({ di, ui, donem, urun });
      });
    });
    return gruplar;
  }, [secilenDonemler, secilenUrunler]);

  const genelGrupSayisi = gorunurGruplar.filter((g) => g.di === 0).length;
  const tarihliGrupSayisi = gorunurGruplar.filter((g) => g.di > 0).length;

  function donemFiltresiDegistir(index: number) {
    setSecilenDonemler((onceki) => {
      const yeni = new Set(onceki);
      if (yeni.has(index)) yeni.delete(index);
      else yeni.add(index);
      return yeni;
    });
  }

  function urunFiltresiDegistir(ad: string) {
    setSecilenUrunler((onceki) => {
      const yeni = new Set(onceki);
      if (yeni.has(ad)) yeni.delete(ad);
      else yeni.add(ad);
      return yeni;
    });
  }

  function yilDegistir(yeniYil: number) {
    router.push(`/musteriler/${customer.id}/yaprak-gubreleme-plani?yil=${yeniYil}`);
  }

  function hucreDegisti(parcelId: string, anahtar: string, deger: string) {
    setDegerlerByParcel((onceki) => ({
      ...onceki,
      [parcelId]: { ...onceki[parcelId], [anahtar]: deger },
    }));
  }

  function vazgec() {
    setDegerlerByParcel(
      Object.fromEntries(parcels.map((p) => [p.id, degerleriStringMapineDonustur(planByParcelId.get(p.id))])),
    );
  }

  function kaydet() {
    startTransition(async () => {
      await Promise.all(
        parcels.map((parcel) => {
          const fd = new FormData();
          fd.set("yil", String(secilenYil));
          fd.set("degerlerJson", JSON.stringify(degerlerByParcel[parcel.id] ?? {}));
          return saveYaprakGubrelemePlaniAction(customer.id, parcel.id, fd);
        }),
      );
      addNotification(`${secilenYil} Yaprak Gübreleme Planı kaydedildi.`);
      router.refresh();
    });
  }

  return (
    <div className="card ygp-kart">
      <div className="ygp-intro">
        <p>
          Yılda bir kez doldurulan sabit şablon — 1 &quot;Genel&quot; grup (sezon boyu) + 14 tarihli dönem, toplam 35
          ürün satırı / 105 alan. Müşterinin tüm parselleri aynı tabloda; Block No / Ürün &amp; Çeşit / Ha / Ağaç-Ha
          her parselin kendi bilgilerinden otomatik dolduruldu, geri kalan her sayıyı sen giriyorsun.
        </p>
      </div>

      <div className="ygp-head">
        <div className="ygp-filtreler">
          <FiltreDropdown
            etiket="Dönem"
            secenekler={donemSecenekleri.map((d) => ({ deger: d.index, ad: d.baslik }))}
            secili={secilenDonemler}
            onDegistir={donemFiltresiDegistir}
          />
          <FiltreDropdown
            etiket="Ürün"
            secenekler={urunSecenekleri.map((ad) => ({ deger: ad, ad }))}
            secili={secilenUrunler}
            onDegistir={urunFiltresiDegistir}
          />
        </div>
        <div className="ygp-head-actions">
          <select className="ygp-yil-select" value={secilenYil} onChange={(e) => yilDegistir(Number(e.target.value))}>
            {yilSecenekleri.map((yil) => (
              <option key={yil} value={yil}>
                {yil}
                {kayitliYillar.includes(yil) ? " · kayıtlı" : ""}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={vazgec} disabled={isPending}>
            Vazgeç
          </button>
          <button type="button" className="btn btn-primary" onClick={kaydet} disabled={isPending}>
            {isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <DisaAktarButton
            dosyaAdi={`${customer.ad} - Yaprak Gübreleme Plani ${secilenYil}`}
            belgeBasligi={`${customer.ad} — Yaprak Gübreleme Planı ${secilenYil}`}
            tablolariGetir={() => [{ baslik: `Yaprak Gübreleme Plani ${secilenYil}`, eleman: tabloRef.current, sabitSutunSayisi: 5 }]}
          />
        </div>
      </div>

      {parcels.length === 0 ? (
        <div className="empty-note">Bu müşterinin henüz parseli yok.</div>
      ) : (
        <div className="ygp-sheet-wrap">
          <table className="ygp-sheet" ref={tabloRef}>
            <thead>
              <tr>
                <th className="ygp-frozen ygp-c1 ygp-meta-h" rowSpan={4}>
                  <span className="ygp-cell">No</span>
                </th>
                <th className="ygp-frozen ygp-c2 ygp-meta-h" rowSpan={4}>
                  <span className="ygp-cell">Block No</span>
                </th>
                <th className="ygp-frozen ygp-c3 ygp-meta-h" rowSpan={4}>
                  <span className="ygp-cell">Ürün &amp; Çeşit</span>
                </th>
                <th className="ygp-frozen ygp-c4 ygp-meta-h" rowSpan={4}>
                  <span className="ygp-cell">Ha</span>
                </th>
                <th className="ygp-frozen ygp-c5 ygp-frozen-shadow ygp-meta-h" rowSpan={4}>
                  <span className="ygp-cell">Ağaç/Ha</span>
                </th>
                {genelGrupSayisi > 0 && (
                  <th colSpan={genelGrupSayisi * 3} className="ygp-banner-genel">
                    Genel — sezon boyu sabit
                  </th>
                )}
                {tarihliGrupSayisi > 0 && (
                  <th colSpan={tarihliGrupSayisi * 3} className="ygp-banner-tarihli">
                    Ocak sonu – Eylül başı arası — tarihli dönemler
                  </th>
                )}
                {gorunurGruplar.length === 0 && <th className="ygp-banner-tarihli">Filtreyle eşleşen ürün yok</th>}
              </tr>
              <tr>
                {gorunurGruplar.map(({ di, ui, donem, urun }) =>
                  urun.uyari ? (
                    <th key={`${di}-${ui}`} colSpan={3} className="ygp-uyari-baslik">
                      {urun.uyari}
                    </th>
                  ) : (
                    <th key={`${di}-${ui}`} colSpan={3} className="ygp-donem-baslik">
                      {donem.baslik}
                    </th>
                  ),
                )}
              </tr>
              <tr>
                {gorunurGruplar.map(({ di, ui, urun }) => (
                  <th key={`${di}-${ui}`} colSpan={3} className="ygp-urun-h" style={{ background: urun.renk }}>
                    {urun.ad}
                  </th>
                ))}
              </tr>
              <tr>
                {gorunurGruplar.flatMap(({ di, ui, urun }) =>
                  urun.kolonlar.map((kolon, ki) => (
                    <th key={`${di}-${ui}-${ki}`} className={`ygp-sub-h${kolon.etiket === "depoX" ? " ygp-depox" : ""}`}>
                      {kolon.etiket}
                      {kolon.aynenExcel && <span className="ygp-aynen-flag" title="Excel'de aynen böyle yazıyor" />}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {parcels.map((parcel, index) => {
                const meta = ygpMetaHesapla(parcel);
                const degerler = degerlerByParcel[parcel.id] ?? {};
                const vurgulanan = parcel.id === vurgulananParcelId;
                return (
                  <tr key={parcel.id} ref={vurgulanan ? vurgulananSatirRef : null} className={vurgulanan ? "ygp-satir-vurgulu" : ""}>
                    <td className="ygp-frozen ygp-c1 ygp-meta-v">
                      <span className="ygp-cell">
                        {index + 1}{" "}
                        <span className="ygp-parsel-adi">{parcel.ad}</span>
                      </span>
                    </td>
                    <td className="ygp-frozen ygp-c2 ygp-meta-v">
                      <span className="ygp-cell">{parcel.blockNo}</span>
                    </td>
                    <td className="ygp-frozen ygp-c3 ygp-meta-v ygp-text">
                      <span className="ygp-cell">{meta.cultivar}</span>
                    </td>
                    <td className="ygp-frozen ygp-c4 ygp-meta-v">
                      <span className="ygp-cell">{meta.ha.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="ygp-frozen ygp-c5 ygp-frozen-shadow ygp-meta-v">
                      <span className="ygp-cell">{meta.treesPerHa ?? "—"}</span>
                    </td>
                    {gorunurGruplar.flatMap(({ di, ui, urun }) =>
                      urun.kolonlar.map((kolon, ki) => {
                        const anahtar = ygpAnahtar(di, ui, ki);
                        const depox = kolon.etiket === "depoX";
                        return (
                          <td
                            key={anahtar}
                            className={`ygp-veri-hucre${depox ? " ygp-depox" : ""}${kolon.aynenExcel ? " ygp-aynen" : ""}`}
                          >
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={degerler[anahtar] ?? ""}
                              onChange={(e) => hucreDegisti(parcel.id, anahtar, e.target.value)}
                            />
                          </td>
                        );
                      }),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
