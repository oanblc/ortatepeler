"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@/components/IconSprite";
import { StarPicker } from "@/components/StarPicker";
import { useNotifications } from "@/components/NotificationsProvider";
import { saveParselDegerlendirmeAction } from "@/lib/actions";
import { soruTipi } from "@/lib/degerlendirme";
import type { DegerlendirmeSorusu, ParselDegerlendirmesi } from "@/types";

// Parsel Detayı'ndaki "Genel Değerlendirme" kartının içeriği — Ayarlar'da
// tanımlı her soruya 1-5 yıldız + opsiyonel not, yıl bazlı (aynı yıl tekrar
// kaydedilirse üzerine günceller, bkz. actions.ts saveParselDegerlendirmeAction).
export function GenelDegerlendirmeKarti({
  customerId,
  parcelId,
  sorular,
  mevcutDegerlendirme,
  yil,
  yillar,
  isAdmin,
}: {
  customerId: string;
  parcelId: string;
  sorular: DegerlendirmeSorusu[];
  mevcutDegerlendirme: ParselDegerlendirmesi | null;
  yil: string;
  /** Yıl seçicide gösterilecek yıllar — güncel yıl + kayıt bulunan yıllar (page.tsx'te hazırlanır), azalan sırada. */
  yillar: string[];
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { addNotification } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  function yilDegistir(yeniYil: string) {
    router.push(`${pathname}?degerlendirmeYili=${yeniYil}`, { scroll: false });
  }

  if (sorular.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="star" className="icon" />
        <p>
          Bu parsel için tanımlı değerlendirme sorusu yok.
          {isAdmin && (
            <>
              {" "}
              <Link href="/ayarlar/genel-degerlendirme">Ayarlar&apos;dan soru ekleyip parsele atayabilirsiniz.</Link>
            </>
          )}
        </p>
      </div>
    );
  }

  const action = saveParselDegerlendirmeAction.bind(null, customerId, parcelId, yil);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(formData);
      addNotification(`${yil} Genel Değerlendirmesi kaydedildi.`);
      router.refresh();
    });
  }

  return (
    // key={yil}: StarPicker/textarea kendi başlangıç değerini sadece mount anında
    // okuyan uncontrolled bileşenler (bkz. StarPicker.tsx) — yıl değişince tüm
    // formun yeniden mount olması gerekiyor, aksi halde bir önceki yılın
    // yıldız/not değerleri ekranda kalır.
    <form onSubmit={handleSubmit} key={yil}>
      <div className="gd-yil-secici">
        <label htmlFor="gd-yil-select">Yıl</label>
        <select id="gd-yil-select" value={yil} onChange={(e) => yilDegistir(e.target.value)}>
          {yillar.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="gd-list">
        {sorular.map((soru) => {
          const cevap = mevcutDegerlendirme?.cevaplar.find((c) => c.soruId === soru.id);
          const tip = soruTipi(soru);
          return (
            <div className="gd-item" key={soru.id}>
              <div className="gd-soru">{soru.soru}</div>
              {tip === "puan" && (
                <>
                  <StarPicker name={`puan_${soru.id}`} baslangic={cevap?.puan ?? 0} />
                  <textarea
                    name={`not_${soru.id}`}
                    defaultValue={cevap?.not}
                    placeholder="Not (opsiyonel)"
                    className="gd-not"
                    rows={2}
                  />
                </>
              )}
              {tip === "secmeli" && (
                <div className="gd-secenekler">
                  {(soru.secenekler ?? []).map((sec) => (
                    <label key={sec} className="gd-secenek">
                      <input type="radio" name={`secim_${soru.id}`} value={sec} defaultChecked={cevap?.secim === sec} />
                      <span>{sec}</span>
                    </label>
                  ))}
                </div>
              )}
              {tip === "metin" && (
                <textarea
                  name={`metin_${soru.id}`}
                  defaultValue={cevap?.metin}
                  placeholder="Cevabınızı yazın"
                  className="gd-not"
                  rows={3}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="gd-foot">
        <span className="gd-yil">{yil} değerlendirmesi</span>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
