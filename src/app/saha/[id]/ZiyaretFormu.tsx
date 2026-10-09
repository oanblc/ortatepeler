"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createZiyaretKaydiAction } from "@/lib/actions";
import { gorselKucult } from "@/lib/gorselKucult";
import { FENOLOJIK_DONEM_LISTESI, ZIYARET_DURUM_SECENEKLERI } from "@/lib/tarim";

type Parsel = { id: string; ad: string; alan: number; urun: string };

function bugun() {
  // Yerel tarih (UTC değil) — gece yarısına yakın kayıtlarda gün kaymasın.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ZiyaretFormu({ customerId, parseller, hastalikAdlari }: { customerId: string; parseller: Parsel[]; hastalikAdlari: string[] }) {
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [aciklama, setAciklama] = useState("");
  const [recete, setRecete] = useState("");
  const [fenolojik, setFenolojik] = useState("");
  const [durum, setDurum] = useState("");
  const [hastaliklar, setHastaliklar] = useState<string[]>([]);
  const [hastalikAra, setHastalikAra] = useState("");
  const [fotolar, setFotolar] = useState<File[]>([]);
  const [fotoIsleniyor, setFotoIsleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedilen, setKaydedilen] = useState<string[] | null>(null);
  const fotoInput = useRef<HTMLInputElement>(null);

  const onizleme = useMemo(() => fotolar.map((f) => URL.createObjectURL(f)), [fotolar]);
  const aranan = q.trim().toLocaleLowerCase("tr");
  const liste = aranan ? parseller.filter((p) => p.ad.toLocaleLowerCase("tr").includes(aranan)) : parseller;

  function degistir(id: string) {
    setSecili((onceki) => {
      const yeni = new Set(onceki);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });
  }

  async function fotoSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosyalar = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (dosyalar.length === 0) return;
    setFotoIsleniyor(true);
    try {
      const kucuk = await Promise.all(dosyalar.map((d) => gorselKucult(d)));
      setFotolar((o) => [...o, ...kucuk]);
    } finally {
      setFotoIsleniyor(false);
    }
  }

  function temizle() {
    setSecili(new Set());
    setAciklama("");
    setRecete("");
    setFenolojik("");
    setDurum("");
    setHastaliklar([]);
    setHastalikAra("");
    setFotolar([]);
    setQ("");
  }

  async function kaydet() {
    if (secili.size === 0 || !tarih) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const fd = new FormData();
      fd.set("tarih", tarih);
      secili.forEach((id) => fd.append("parcelIds", id));
      if (aciklama.trim()) fd.set("aciklama", aciklama.trim());
      if (recete.trim()) fd.set("recete", recete.trim());
      if (fenolojik) fd.set("fenolojikDonem", fenolojik);
      if (durum) fd.set("durum", durum);
      hastaliklar.forEach((h) => fd.append("hastaliklar", h));
      fotolar.forEach((f) => fd.append("fotograflar", f));
      await createZiyaretKaydiAction(customerId, fd);
      setKaydedilen(parseller.filter((p) => secili.has(p.id)).map((p) => p.ad));
      temizle();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Saha ziyaret kaydı kaydedilemedi:", err);
      setHata("Kayıt gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin; yazdıklarınız korundu.");
    } finally {
      setGonderiliyor(false);
    }
  }

  if (parseller.length === 0) {
    return <p className="sh-bos">Bu müşterinin henüz parseli yok.</p>;
  }

  return (
    <div className="sh-form">
      {kaydedilen && (
        <div className="sh-basari" role="status">
          <strong>Ziyaret kaydedildi.</strong>
          <span>{kaydedilen.join(", ")}</span>
          <div className="sh-basari-aksiyon">
            <button type="button" onClick={() => setKaydedilen(null)}>
              Yeni kayıt gir
            </button>
            <Link href="/saha">Başka müşteri</Link>
          </div>
        </div>
      )}

      <section className="sh-bolum">
        <h2>
          1. Parsel seç <span className="sh-sayac">{secili.size > 0 ? `${secili.size} seçili` : ""}</span>
        </h2>
        {parseller.length > 8 && (
          <input className="sh-ara" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parsel ara…" aria-label="Parsel ara" />
        )}
        <div className="sh-parsel-liste" role="group" aria-label="Parseller">
          {liste.map((p) => (
            <button
              key={p.id}
              type="button"
              className="sh-parsel"
              data-secili={secili.has(p.id)}
              aria-pressed={secili.has(p.id)}
              onClick={() => degistir(p.id)}
            >
              <span className="sh-tik" aria-hidden="true">{secili.has(p.id) ? "✓" : ""}</span>
              <span className="sh-parsel-ad">{p.ad}</span>
              <span className="sh-parsel-alt">
                {p.alan ? `${p.alan} dekar` : "—"}
                {p.urun ? ` · ${p.urun}` : ""}
              </span>
            </button>
          ))}
          {liste.length === 0 && <p className="sh-bos">Eşleşen parsel yok.</p>}
        </div>
        {parseller.length > 1 && (
          <div className="sh-hizli">
            <button type="button" onClick={() => setSecili(new Set(parseller.map((p) => p.id)))}>
              Tümünü seç
            </button>
            <button type="button" onClick={() => setSecili(new Set())}>
              Temizle
            </button>
          </div>
        )}
      </section>

      <section className="sh-bolum">
        <h2>2. Ziyaret bilgisi</h2>
        <label className="sh-alan">
          <span>Tarih</span>
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} max={bugun()} />
        </label>
        <label className="sh-alan">
          <span>Gözlem / açıklama</span>
          <textarea rows={4} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Bu ziyarette görülenler, yapılan işlemler…" />
        </label>

        <div className="sh-alan">
          <span>Fotoğraf</span>
          <div className="sh-fotolar">
            {fotolar.map((f, i) => (
              <div className="sh-foto" key={`${f.name}-${i}`}>
                <img src={onizleme[i]} alt="" />
                <button type="button" aria-label="Fotoğrafı kaldır" onClick={() => setFotolar((o) => o.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="sh-foto-ekle" onClick={() => fotoInput.current?.click()} disabled={fotoIsleniyor}>
              {fotoIsleniyor ? "Hazırlanıyor…" : "+ Fotoğraf"}
            </button>
            <input ref={fotoInput} type="file" accept="image/*" multiple hidden onChange={fotoSecildi} />
          </div>
        </div>

        {hastalikAdlari.length > 0 && (
          <div className="sh-alan">
            <span>
              Hastalık / zararlı (isteğe bağlı) <em className="sh-sayac">{hastaliklar.length > 0 ? `${hastaliklar.length} seçili` : ""}</em>
            </span>
            {hastalikAdlari.length > 8 && (
              <input type="search" value={hastalikAra} onChange={(e) => setHastalikAra(e.target.value)} placeholder="Hastalık ara…" aria-label="Hastalık ara" />
            )}
            <div className="sh-etiketler" role="group" aria-label="Hastalık / zararlı">
              {hastalikAdlari
                .filter((ad) => !hastalikAra.trim() || ad.toLocaleLowerCase("tr").includes(hastalikAra.trim().toLocaleLowerCase("tr")))
                .map((ad) => (
                  <button
                    key={ad}
                    type="button"
                    className="sh-etiket"
                    data-secili={hastaliklar.includes(ad)}
                    aria-pressed={hastaliklar.includes(ad)}
                    onClick={() => setHastaliklar((o) => (o.includes(ad) ? o.filter((x) => x !== ad) : [...o, ad]))}
                  >
                    {ad}
                  </button>
                ))}
            </div>
          </div>
        )}

        <label className="sh-alan">
          <span>İlaç reçetesi (isteğe bağlı)</span>
          <textarea rows={2} value={recete} onChange={(e) => setRecete(e.target.value)} placeholder="Örn. %65 Malathion 1lt + Abamectin 1lt / 1 ton suya" />
        </label>

        <div className="sh-iki">
          <label className="sh-alan">
            <span>Fenolojik dönem</span>
            <select value={fenolojik} onChange={(e) => setFenolojik(e.target.value)}>
              <option value="">Seçilmedi</option>
              {FENOLOJIK_DONEM_LISTESI.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="sh-alan">
            <span>Durum</span>
            <select value={durum} onChange={(e) => setDurum(e.target.value)}>
              {ZIYARET_DURUM_SECENEKLERI.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {hata && (
        <p role="alert" className="sh-hata">
          {hata}
        </p>
      )}

      <div className="sh-kaydet-cubuk">
        <button type="button" className="sh-kaydet" onClick={kaydet} disabled={gonderiliyor || fotoIsleniyor || secili.size === 0 || !tarih}>
          {gonderiliyor
            ? "Kaydediliyor…"
            : fotoIsleniyor
              ? "Fotoğraf hazırlanıyor…"
              : secili.size === 0
                ? "Önce parsel seçin"
                : `${secili.size} parsel için kaydet`}
        </button>
      </div>
    </div>
  );
}
