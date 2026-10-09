"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { useNotifications } from "@/components/NotificationsProvider";
import { musteriExcelOnizleAction, musteriExcelIceAktarAction } from "@/lib/musteriImportActions";
import type { ExcelSatiri, ParselSatiri } from "@/lib/musteriExcel";

const DURUM_ADI = { eklenecek: "Eklenecek", atlanacak: "Atlanacak", hatali: "Hatalı" } as const;
type Durum = keyof typeof DURUM_ADI;

type Sonuc = { musteriEklenen: number; parselEklenen: number; atlanan: number; hatali: number };

function DurumHucresi({ durum, mesaj }: { durum: Durum; mesaj?: string }) {
  return (
    <td>
      <span className="ia-durum" data-durum={durum}>
        {DURUM_ADI[durum]}
      </span>
      {mesaj && <div className="ia-mesaj">{mesaj}</div>}
    </td>
  );
}

function Ozet({ satirlar }: { satirlar: { durum: Durum }[] }) {
  const n = (d: Durum) => satirlar.filter((s) => s.durum === d).length;
  return (
    <div className="ia-ozet">
      <span className="gdq-chip">{n("eklenecek")} eklenecek</span>
      <span className="gdq-chip gdq-chip-soft">{n("atlanacak")} atlanacak</span>
      <span className="ia-hatali-chip">{n("hatali")} hatalı</span>
    </div>
  );
}

export function IceAktarForm({ maksSatir }: { maksSatir: number }) {
  const { addNotification } = useNotifications();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [musteriler, setMusteriler] = useState<ExcelSatiri[] | null>(null);
  const [parseller, setParseller] = useState<ParselSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [bekliyor, start] = useTransition();

  const onizlemeVar = musteriler !== null && parseller !== null;
  const eklenecekMusteri = musteriler?.filter((s) => s.durum === "eklenecek").length ?? 0;
  const eklenecekParsel = parseller?.filter((s) => s.durum === "eklenecek").length ?? 0;

  function formVerisi() {
    const fd = new FormData();
    if (dosya) fd.set("dosya", dosya);
    return fd;
  }

  function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    setDosya(e.target.files?.[0] ?? null);
    setMusteriler(null);
    setParseller(null);
    setSonuc(null);
    setHata(null);
  }

  function onizle() {
    setHata(null);
    start(async () => {
      const r = await musteriExcelOnizleAction(formVerisi());
      if ("hata" in r) {
        setMusteriler(null);
        setParseller(null);
        setHata(r.hata);
      } else {
        setMusteriler(r.musteriler);
        setParseller(r.parseller);
      }
    });
  }

  function iceAktar() {
    setHata(null);
    start(async () => {
      const r = await musteriExcelIceAktarAction(formVerisi());
      if ("hata" in r) {
        setHata(r.hata);
        return;
      }
      setSonuc(r);
      setMusteriler(null);
      setParseller(null);
      setDosya(null);
      if (inputRef.current) inputRef.current.value = "";
      addNotification(`Excel'den ${r.musteriEklenen} müşteri, ${r.parselEklenen} parsel içe aktarıldı.`);
    });
  }

  return (
    <div className="ia-sayfa">
      <div className="card ayarlar-card">
        <div className="card-head">
          <h3>1. Şablonu indirin ve doldurun</h3>
          <a href="/musteriler/sablon" className="btn" download>
            <Icon name="download" />
            Şablonu İndir
          </a>
        </div>
        <p className="card-desc">
          Şablonda iki sayfa var: <strong>Müşteriler</strong> ve <strong>Parseller</strong>. Her satıra bir kayıt yazın,
          sadece birini de doldurabilirsiniz. Parsel satırındaki müşteri adı, aynı dosyadaki Müşteriler sayfasından ya da
          sistemde kayıtlı bir müşteriden olmalı. Aynı isimde zaten kayıtlı müşteri/parseller atlanır. Parsel sınırı Excel&apos;den
          girilemez, sonra parsel sayfasından çizilir. Her sayfada en fazla {maksSatir} satır.
        </p>
      </div>

      <div className="card ayarlar-card">
        <div className="card-head">
          <h3>2. Dosyayı yükleyip kontrol edin</h3>
        </div>
        <div className="ia-dosya-satiri">
          <input ref={inputRef} type="file" accept=".xlsx" onChange={dosyaSecildi} />
          <button type="button" className="btn btn-primary" onClick={onizle} disabled={!dosya || bekliyor}>
            {bekliyor && !onizlemeVar ? "Okunuyor…" : "Önizle"}
          </button>
        </div>
        {hata && (
          <p role="alert" className="zk-hata">
            {hata}
          </p>
        )}

        {sonuc && (
          <div className="yb-basari" style={{ marginTop: 14 }}>
            <strong>
              {sonuc.musteriEklenen} müşteri ve {sonuc.parselEklenen} parsel eklendi.
            </strong>
            {(sonuc.atlanan > 0 || sonuc.hatali > 0) && (
              <span>
                {sonuc.atlanan} satır atlandı, {sonuc.hatali} satır hatalı olduğu için eklenmedi.
              </span>
            )}
            <Link href="/musteriler" className="btn btn-primary">
              Müşterilere Git
            </Link>
          </div>
        )}

        {onizlemeVar && (
          <>
            {musteriler.length > 0 && (
              <>
                <h4 className="ia-baslik">Müşteriler</h4>
                <Ozet satirlar={musteriler} />
                <div className="table-scroll ia-tablo">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Satır</th>
                        <th>Müşteri</th>
                        <th>Adres</th>
                        <th>İlgili Kişiler</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {musteriler.map((s) => (
                        <tr key={s.satir} data-durum={s.durum}>
                          <td>{s.satir}</td>
                          <td>{s.ad || "—"}</td>
                          <td>{s.adres || "—"}</td>
                          <td>
                            {s.ilgiliKisiler.length === 0
                              ? "—"
                              : s.ilgiliKisiler.map((k) => [k.ad, k.telefon, k.email].filter(Boolean).join(" · ")).join(" | ")}
                          </td>
                          <DurumHucresi durum={s.durum} mesaj={s.mesaj} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {parseller.length > 0 && (
              <>
                <h4 className="ia-baslik">Parseller</h4>
                <Ozet satirlar={parseller} />
                <div className="table-scroll ia-tablo">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Satır</th>
                        <th>Müşteri</th>
                        <th>Parsel</th>
                        <th>Alan</th>
                        <th>Ürün / Anaç</th>
                        <th>Sulama</th>
                        <th>Ağaç</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseller.map((s) => (
                        <tr key={s.satir} data-durum={s.durum}>
                          <td>{s.satir}</td>
                          <td>{s.musteriAdi || "—"}</td>
                          <td>{s.ad || "—"}</td>
                          <td>{s.alanDonum ? `${s.alanDonum} dekar` : "—"}</td>
                          <td>{s.urunler.length ? s.urunler.map((u) => (u.anac ? `${u.urun} / ${u.anac}` : u.urun)).join(", ") : "—"}</td>
                          <td>{s.sulamaSekli || "—"}</td>
                          <td>{s.agacSayisi ?? "—"}</td>
                          <DurumHucresi durum={s.durum} mesaj={s.mesaj} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={iceAktar} disabled={bekliyor || eklenecekMusteri + eklenecekParsel === 0}>
                {bekliyor ? "Aktarılıyor…" : `${eklenecekMusteri} müşteri ve ${eklenecekParsel} parseli içe aktar`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
