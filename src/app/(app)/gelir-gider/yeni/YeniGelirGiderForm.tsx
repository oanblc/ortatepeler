"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/IconSprite";
import { useNotifications } from "@/components/NotificationsProvider";
import { createGelirGiderKaydiAction } from "@/lib/actions";
import type { Customer, GelirGiderTur } from "@/types";

export function YeniGelirGiderForm({ musteriler, kategoriler }: { musteriler: Customer[]; kategoriler: string[] }) {
  const router = useRouter();
  const { addNotification } = useNotifications();

  const bugunIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [tur, setTur] = useState<GelirGiderTur>("gider");
  const [tarih, setTarih] = useState(bugunIso);
  const [tutar, setTutar] = useState("");
  const [kategori, setKategori] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fisler, setFisler] = useState<File[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const fisInputRef = useRef<HTMLInputElement>(null);

  // Fiş önizlemeleri — CustomerDetailTabs.tsx'teki Ziyaret Kaydı fotoğraf
  // yükleme deseninin birebir aynısı: blob URL'ler useMemo ile türetilir,
  // bellek sızıntısı olmasın diye ayrı bir effect'in cleanup'ında geri alınır.
  const fisOnizlemeUrls = useMemo(() => fisler.map((dosya) => URL.createObjectURL(dosya)), [fisler]);
  useEffect(() => {
    return () => {
      fisOnizlemeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fisOnizlemeUrls]);

  function fisSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const secilenler = Array.from(e.target.files ?? []);
    if (secilenler.length > 0) {
      setFisler((onceki) => [...onceki, ...secilenler]);
    }
    // Aynı dosya tekrar seçilebilsin diye input sıfırlanır.
    e.target.value = "";
  }

  function fisKaldir(index: number) {
    setFisler((onceki) => onceki.filter((_, i) => i !== index));
  }

  async function kaydet() {
    if (!tarih || !kategori.trim() || !tutar) return;
    setKaydediliyor(true);
    try {
      const fd = new FormData();
      fd.set("tur", tur);
      fd.set("tarih", tarih);
      fd.set("tutar", tutar);
      fd.set("kategori", kategori.trim());
      if (aciklama.trim()) fd.set("aciklama", aciklama.trim());
      if (customerId) fd.set("customerId", customerId);
      fisler.forEach((dosya) => fd.append("fisler", dosya));

      await createGelirGiderKaydiAction(fd);
      addNotification("Gelir/gider kaydı eklendi.");
      router.push("/gelir-gider");
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="card gg-form">
      <div className="field">
        <label>Tür</label>
        <div className={`tur-pills${tur === "gider" ? " tur-pills-gider" : ""}`} style={{ width: "fit-content" }} role="group" aria-label="Kayıt türü">
          <button type="button" aria-pressed={tur === "gelir"} onClick={() => setTur("gelir")}>
            Gelir
          </button>
          <button type="button" aria-pressed={tur === "gider"} onClick={() => setTur("gider")}>
            Gider
          </button>
        </div>
      </div>

      <div className="field-row2">
        <div className="field">
          <label>Tarih</label>
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div className="field">
          <label>Tutar (₺){tur === "gider" && <span className="field-hint"> — iade/alacak için negatif girilebilir</span>}</label>
          <input
            type="number"
            min={tur === "gider" ? undefined : "0"}
            step="0.01"
            value={tutar}
            onChange={(e) => setTutar(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="field-row2">
        <div className="field">
          <label>Kategori</label>
          <input
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            placeholder="Örn. Yakıt, Malzeme, Ulaşım..."
            list="kategori-listesi"
          />
          <datalist id="kategori-listesi">
            {kategoriler.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>İlişkili Müşteri (opsiyonel)</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Seçilmedi</option>
            {musteriler.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ad}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Açıklama</label>
        <textarea
          rows={2}
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Örn. Saha ziyareti yakıt gideri"
        />
      </div>

      <div className="field">
        <label>Fiş / Fatura (opsiyonel)</label>
        <div className="foto-dropzone">
          {fisler.map((dosya, i) => (
            <div className="foto-thumb" key={`${dosya.name}-${i}`}>
              <img src={fisOnizlemeUrls[i]} alt="" />
              <button type="button" className="sil" aria-label="kaldır" onClick={() => fisKaldir(i)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="foto-ekle-btn" onClick={() => fisInputRef.current?.click()}>
            <Icon name="plus" />
            Ekle
          </button>
          <input ref={fisInputRef} type="file" accept="image/*" multiple hidden onChange={fisSecildi} />
        </div>
        <div className="foto-hint">Fiş/fatura fotoğrafını kaydın kanıtı olarak eklemek için.</div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={() => router.push("/gelir-gider")}>
          Vazgeç
        </button>
        <button
          type="button"
          className={`btn ${tur === "gider" ? "btn-gider-vurgu" : "btn-primary"}`}
          onClick={kaydet}
          disabled={kaydediliyor || !tarih || !kategori.trim() || !tutar}
        >
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
