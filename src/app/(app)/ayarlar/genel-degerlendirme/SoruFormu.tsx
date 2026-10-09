"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/IconSprite";
import { useNotifications } from "@/components/NotificationsProvider";
import { SORU_TIPLERI } from "@/lib/degerlendirme";
import type { DegerlendirmeSoruTipi, DegerlendirmeSorusu } from "@/types";

export type ParselSecenegi = { id: string; ad: string; musteriAd: string };

// Genel Değerlendirme sorusu formu — hem "yeni soru" hem "düzenle" için.
// Soru tipine göre seçenek alanı, atamaya göre parsel listesi açılıp kapanır.
export function SoruFormu({
  action,
  parseller,
  soru,
  onTamam,
}: {
  action: (formData: FormData) => Promise<void>;
  parseller: ParselSecenegi[];
  soru?: DegerlendirmeSorusu;
  onTamam?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [tip, setTip] = useState<DegerlendirmeSoruTipi>(soru?.tip ?? "secmeli");
  const [parselMod, setParselMod] = useState<"tumu" | "secili">(soru?.parselIds?.length ? "secili" : "tumu");
  const [hata, setHata] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { addNotification } = useNotifications();

  const musteriler = Array.from(new Set(parseller.map((p) => p.musteriAd)));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setHata(null);
    startTransition(async () => {
      try {
        await action(fd);
        addNotification(soru ? "Soru güncellendi." : "Soru eklendi.");
        if (!soru) {
          formRef.current?.reset();
          setTip("secmeli");
          setParselMod("tumu");
        }
        onTamam?.();
      } catch (err) {
        setHata(err instanceof Error ? err.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="gdq-form">
      <div className="field">
        <label>Soru</label>
        <input name="soru" required defaultValue={soru?.soru} placeholder="Örn. Sulama planına ne kadar uyduk?" />
      </div>

      <div className="field">
        <label>Cevap Tipi</label>
        <div className="gdq-tip-grid">
          {SORU_TIPLERI.map((t) => (
            <label key={t.id} className="gdq-tip" data-aktif={tip === t.id}>
              <input type="radio" name="tip" value={t.id} checked={tip === t.id} onChange={() => setTip(t.id)} />
              <span className="gdq-tip-ad">{t.ad}</span>
              <span className="gdq-tip-ack">{t.aciklama}</span>
            </label>
          ))}
        </div>
      </div>

      {tip === "secmeli" && (
        <div className="field">
          <label>Seçenekler</label>
          <textarea
            name="secenekler"
            rows={4}
            defaultValue={soru?.secenekler?.join("\n")}
            placeholder={"Her satıra bir seçenek yazın\nÖrn.\nEvet\nKısmen\nHayır"}
          />
          <p className="wizard-hint" style={{ marginTop: 4 }}>
            En az 2 seçenek. Parselde bu seçeneklerden yalnızca biri seçilir.
          </p>
        </div>
      )}

      <div className="field">
        <label>Hangi parsellere sorulsun?</label>
        <div className="gdq-atama">
          <label className="gdq-radio">
            <input type="radio" name="parselMod" value="tumu" checked={parselMod === "tumu"} onChange={() => setParselMod("tumu")} />
            Tüm parseller (yeni eklenenler dahil)
          </label>
          <label className="gdq-radio">
            <input type="radio" name="parselMod" value="secili" checked={parselMod === "secili"} onChange={() => setParselMod("secili")} />
            Sadece seçtiğim parseller
          </label>
        </div>
        {parselMod === "secili" && (
          <div className="gdq-parsel-list">
            {parseller.length === 0 && <p className="well-empty-note">Henüz parsel yok.</p>}
            {musteriler.map((m) => (
              <div key={m} className="gdq-parsel-grup">
                <div className="gdq-parsel-musteri">{m}</div>
                {parseller
                  .filter((p) => p.musteriAd === m)
                  .map((p) => (
                    <label key={p.id} className="kuyu-secim-row">
                      <input type="checkbox" name="parselIds" value={p.id} defaultChecked={soru?.parselIds?.includes(p.id)} />
                      <span>{p.ad}</span>
                    </label>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {hata && <p className="gdq-hata">{hata}</p>}

      <div className="gdq-actions">
        {onTamam && (
          <button type="button" className="btn" onClick={onTamam} disabled={isPending}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {!soru && <Icon name="plus" className="icon" />}
          {isPending ? "Kaydediliyor…" : soru ? "Kaydet" : "Soru Ekle"}
        </button>
      </div>
    </form>
  );
}
