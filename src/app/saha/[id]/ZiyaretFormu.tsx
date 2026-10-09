"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createZiyaretKaydiAction } from "@/lib/actions";
import { gorselKucult } from "@/lib/gorselKucult";
import { FENOLOJIK_DONEM_LISTESI, ZIYARET_DURUM_SECENEKLERI } from "@/lib/tarim";

type Parsel = { id: string; ad: string; alan: number; urun: string };

export type ZiyaretOzeti = {
  parcelId: string;
  tarih: string;
  aciklama: string;
  recete: string;
  fenolojik: string;
  durum: string;
  oncelik: number | null;
  hastaliklar: string[];
  gorseller: string[];
};

function bugun() {
  // Yerel tarih (UTC değil) — gece yarısına yakın kayıtlarda gün kaymasın.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tarihYaz(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function ZiyaretFormu({
  customerId,
  parseller,
  hastalikAdlari,
  ziyaretler,
}: {
  customerId: string;
  parseller: Parsel[];
  hastalikAdlari: string[];
  ziyaretler: ZiyaretOzeti[];
}) {
  const router = useRouter();
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [aciklama, setAciklama] = useState("");
  const [recete, setRecete] = useState("");
  const [fenolojik, setFenolojik] = useState("");
  const [durum, setDurum] = useState("");
  const [oncelik, setOncelik] = useState<number | null>(null);
  const [hastaliklar, setHastaliklar] = useState<string[]>([]);
  const [hastalikAra, setHastalikAra] = useState("");
  const [fotolar, setFotolar] = useState<File[]>([]);
  // Düzenleme modu: mevcut bir ziyaret forma yüklenmişse true; kayıttaki fotoğraflar burada tutulur.
  const [duzenleme, setDuzenleme] = useState(false);
  const [mevcutFotolar, setMevcutFotolar] = useState<string[]>([]);
  const [fotoIsleniyor, setFotoIsleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedilen, setKaydedilen] = useState<{ adlar: string[]; guncelleme: boolean } | null>(null);
  const fotoInput = useRef<HTMLInputElement>(null);

  const onizleme = useMemo(() => fotolar.map((f) => URL.createObjectURL(f)), [fotolar]);
  const parselAdi = (id: string) => parseller.find((p) => p.id === id)?.ad ?? "—";
  const ziyaretBul = (parcelId: string, t: string) => ziyaretler.find((z) => z.parcelId === parcelId && z.tarih === t);
  const aranan = q.trim().toLocaleLowerCase("tr");
  const liste = aranan ? parseller.filter((p) => p.ad.toLocaleLowerCase("tr").includes(aranan)) : parseller;
  // Düzenleme modunda değilken seçili parsellerden bu tarihte zaten kaydı olanlar — üzerine yazılacağı için uyarı gösterilir.
  const cakisanlar = duzenleme ? [] : Array.from(secili).filter((id) => ziyaretBul(id, tarih));

  function temizle() {
    setSecili(new Set());
    setAciklama("");
    setRecete("");
    setFenolojik("");
    setDurum("");
    setOncelik(null);
    setHastaliklar([]);
    setHastalikAra("");
    setFotolar([]);
    setMevcutFotolar([]);
    setDuzenleme(false);
    setQ("");
  }

  /** Mevcut bir ziyareti forma yükler (web'deki "Düzenle" ile aynı davranış: seçim sadece o parsel olur). */
  function yukle(z: ZiyaretOzeti, kaydir = false) {
    setSecili(new Set([z.parcelId]));
    setTarih(z.tarih);
    setAciklama(z.aciklama);
    setRecete(z.recete);
    setFenolojik(z.fenolojik);
    setDurum(z.durum);
    setOncelik(z.oncelik);
    setHastaliklar(z.hastaliklar);
    setMevcutFotolar(z.gorseller);
    setFotolar([]);
    setDuzenleme(true);
    setKaydedilen(null);
    if (kaydir) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function parselDegistir(id: string) {
    const zatenSecili = secili.has(id);
    if (zatenSecili) {
      if (duzenleme) temizle();
      else setSecili((o) => new Set([...o].filter((x) => x !== id)));
      return;
    }
    const z = ziyaretBul(id, tarih);
    if (z) {
      yukle(z);
      return;
    }
    if (duzenleme) {
      // düzenlenen kayıttan başka, kaydı olmayan bir parsel seçildi → temiz form
      temizle();
      setSecili(new Set([id]));
      return;
    }
    setSecili((o) => new Set(o).add(id));
  }

  function tarihDegistir(t: string) {
    if (secili.size === 1) {
      const id = Array.from(secili)[0]!;
      const z = ziyaretBul(id, t);
      if (z) {
        yukle(z);
        return;
      }
    }
    // Yeni tarihte kayıt yok: düzenleme bitir, yazılanlar yeni kayıt için kalır (eski kaydın fotoğrafları taşınmaz).
    setTarih(t);
    if (duzenleme) {
      setDuzenleme(false);
      setMevcutFotolar([]);
    }
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
      if (oncelik != null) fd.set("oncelikPuani", String(oncelik));
      hastaliklar.forEach((h) => fd.append("hastaliklar", h));
      if (duzenleme) {
        // Hangi mevcut fotoğrafların kalacağı açıkça bildirilir (kaldırılanlar kayıttan düşer).
        fd.set("mevcutGorselMarker", "1");
        mevcutFotolar.forEach((g) => fd.append("mevcutGorseller", g));
      }
      fotolar.forEach((f) => fd.append("fotograflar", f));
      await createZiyaretKaydiAction(customerId, fd);
      const guncelleme = duzenleme || cakisanlar.length > 0;
      setKaydedilen({ adlar: parseller.filter((p) => secili.has(p.id)).map((p) => p.ad), guncelleme });
      temizle();
      router.refresh(); // sunucudaki ziyaret listesi yenilensin (düzenleme/uyarılar güncel kalsın)
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

  const sonZiyaretler = ziyaretler.slice(0, 6);
  const kaydetYazisi = gonderiliyor
    ? "Kaydediliyor…"
    : fotoIsleniyor
      ? "Fotoğraf hazırlanıyor…"
      : secili.size === 0
        ? "Önce parsel seçin"
        : duzenleme
          ? "Değişiklikleri kaydet"
          : cakisanlar.length > 0
            ? `${secili.size} parsel için kaydet (üzerine yazar)`
            : `${secili.size} parsel için kaydet`;

  return (
    <div className="sh-form">
      {kaydedilen && (
        <div className="sh-basari" role="status">
          <strong>{kaydedilen.guncelleme ? "Ziyaret güncellendi." : "Ziyaret kaydedildi."}</strong>
          <span>{kaydedilen.adlar.join(", ")}</span>
          <div className="sh-basari-aksiyon">
            <button type="button" onClick={() => setKaydedilen(null)}>
              Yeni kayıt gir
            </button>
            <Link href="/saha">Başka müşteri</Link>
          </div>
        </div>
      )}

      {duzenleme && (
        <div className="sh-duzenleme" role="status">
          <div>
            <strong>Kayıt düzenleniyor</strong>
            <span>
              {parselAdi(Array.from(secili)[0]!)} · {tarihYaz(tarih)}
            </span>
          </div>
          <button type="button" onClick={temizle}>
            Vazgeç
          </button>
        </div>
      )}

      {!duzenleme && sonZiyaretler.length > 0 && (
        <section className="sh-bolum">
          <h2>Son ziyaretler</h2>
          <ul className="sh-son-liste">
            {sonZiyaretler.map((z) => (
              <li key={`${z.parcelId}|${z.tarih}`}>
                <button type="button" onClick={() => yukle(z, true)}>
                  <span className="sh-son-ust">
                    <strong>{parselAdi(z.parcelId)}</strong>
                    <span>{tarihYaz(z.tarih)}</span>
                  </span>
                  <span className="sh-son-alt">
                    {[z.aciklama, z.recete && `Reçete: ${z.recete}`, z.hastaliklar.length > 0 && z.hastaliklar.join(", ")].filter(Boolean).join(" · ") || "Not girilmemiş"}
                  </span>
                  <span className="sh-son-duzenle">Düzenle ›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sh-bolum">
        <h2>
          1. Parsel seç <span className="sh-sayac">{secili.size > 0 ? `${secili.size} seçili` : ""}</span>
        </h2>
        {parseller.length > 8 && (
          <input className="sh-ara" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parsel ara…" aria-label="Parsel ara" />
        )}
        <div className="sh-parsel-liste" role="group" aria-label="Parseller">
          {liste.map((p) => {
            const kayitVar = !!ziyaretBul(p.id, tarih);
            return (
              <button key={p.id} type="button" className="sh-parsel" data-secili={secili.has(p.id)} aria-pressed={secili.has(p.id)} onClick={() => parselDegistir(p.id)}>
                <span className="sh-tik" aria-hidden="true">{secili.has(p.id) ? "✓" : ""}</span>
                <span className="sh-parsel-ad">
                  {p.ad}
                  {kayitVar && <em className="sh-kayit-var">Bu gün kayıt var</em>}
                </span>
                <span className="sh-parsel-alt">
                  {p.alan ? `${p.alan} dekar` : "—"}
                  {p.urun ? ` · ${p.urun}` : ""}
                </span>
              </button>
            );
          })}
          {liste.length === 0 && <p className="sh-bos">Eşleşen parsel yok.</p>}
        </div>
        {parseller.length > 1 && !duzenleme && (
          <div className="sh-hizli">
            <button type="button" onClick={() => setSecili(new Set(parseller.map((p) => p.id)))}>
              Tümünü seç
            </button>
            <button type="button" onClick={() => setSecili(new Set())}>
              Temizle
            </button>
          </div>
        )}
        {cakisanlar.length > 0 && (
          <p className="sh-uyari" role="alert">
            {cakisanlar.length === 1 ? `${parselAdi(cakisanlar[0]!)} için` : `${cakisanlar.length} parsel için`} {tarihYaz(tarih)} tarihinde zaten kayıt var. Kaydederseniz yazdığınız bilgiler o kaydın üzerine yazılır (fotoğraflar silinmez). Düzenlemek için parseli tek başına seçin.
          </p>
        )}
      </section>

      <section className="sh-bolum">
        <h2>2. Ziyaret bilgisi</h2>
        <label className="sh-alan">
          <span>Tarih</span>
          <input type="date" value={tarih} onChange={(e) => tarihDegistir(e.target.value)} max={bugun()} />
        </label>
        <label className="sh-alan">
          <span>Gözlem / açıklama</span>
          <textarea rows={4} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Bu ziyarette görülenler, yapılan işlemler…" />
        </label>

        <div className="sh-alan">
          <span>Fotoğraf</span>
          <div className="sh-fotolar">
            {mevcutFotolar.map((yol) => (
              <div className="sh-foto" key={yol}>
                <img src={yol} alt="Kayıtlı fotoğraf" />
                <button type="button" aria-label="Fotoğrafı kayıttan kaldır" onClick={() => setMevcutFotolar((o) => o.filter((x) => x !== yol))}>
                  ✕
                </button>
              </div>
            ))}
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
              {/* Kayıtta olup listeden silinmiş bir ad da seçili görünür ve kaldırılabilir */}
              {Array.from(new Set([...hastalikAdlari, ...hastaliklar]))
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

        <div className="sh-alan">
          <span>
            Öncelik puanı (isteğe bağlı) <em className="sh-sayac">{oncelik != null ? `${oncelik}` : ""}</em>
          </span>
          <div className="sh-oncelik" role="group" aria-label="Öncelik puanı">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" data-secili={oncelik === n} aria-pressed={oncelik === n} onClick={() => setOncelik((o) => (o === n ? null : n))}>
                {n}
              </button>
            ))}
          </div>
          <small className="sh-ipucu">1 = düşük öncelik, 10 = acil müdahale gerekiyor. Tekrar dokunursanız kaldırılır.</small>
        </div>
      </section>

      {hata && (
        <p role="alert" className="sh-hata">
          {hata}
        </p>
      )}

      <div className="sh-kaydet-cubuk">
        <button type="button" className="sh-kaydet" onClick={kaydet} disabled={gonderiliyor || fotoIsleniyor || secili.size === 0 || !tarih}>
          {kaydetYazisi}
        </button>
      </div>
    </div>
  );
}
