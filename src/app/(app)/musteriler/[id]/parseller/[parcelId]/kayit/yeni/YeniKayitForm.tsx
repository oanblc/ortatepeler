"use client";

import { useState } from "react";
import Link from "next/link";
import { createRecordAction } from "@/lib/actions";
import { Icon } from "@/components/IconSprite";
import type { Customer, Parcel, RecordTypeDef, HastalikTanimi } from "@/types";

function bugun() {
  return new Date().toISOString().slice(0, 10);
}

export function YeniKayitForm({
  customer,
  parcel,
  tipler,
  hastalikTanimlari,
  baslangicTipAdi,
}: {
  customer: Customer;
  parcel: Parcel;
  tipler: RecordTypeDef[];
  hastalikTanimlari: HastalikTanimi[];
  /** Sulama Uyumu gibi sayfalardan "Sulama Kaydı Ekle" ile gelindiğinde ilgili tipi baştan seçili getirir. */
  baslangicTipAdi?: string;
}) {
  const baslangicTipi = baslangicTipAdi ? tipler.find((t) => t.ad === baslangicTipAdi) : undefined;
  const [secilenTipId, setSecilenTipId] = useState(baslangicTipi?.id ?? tipler[0]?.id ?? "");
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const secilenTip = tipler.find((t) => t.id === secilenTipId);

  const boundAction = createRecordAction.bind(null, customer.id, parcel.id);

  function tipDegistir(tip: RecordTypeDef) {
    setSecilenTipId(tip.id);
    setDegerler({});
  }

  function alanDegistir(key: string, value: string) {
    setDegerler((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={boundAction} className="card wizard-card">
      <input type="hidden" name="recordTypeId" value={secilenTipId} readOnly />
      <input type="hidden" name="valuesJson" value={JSON.stringify(degerler)} readOnly />

      <section className="wizard-section">
        <h2>Kayıt Tipi</h2>
        <div className="tip-pills">
          {tipler.map((tip) => (
            <button
              key={tip.id}
              type="button"
              className={`tip-pill${tip.id === secilenTipId ? " active" : ""}`}
              onClick={() => tipDegistir(tip)}
            >
              <Icon name={tip.ikon} />
              {tip.ad}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="kayit-tarih">
            Tarih <span className="req">*</span>
          </label>
          <input id="kayit-tarih" name="tarih" type="date" defaultValue={bugun()} required />
        </div>

        {secilenTip && secilenTip.fields.length > 0 && (
          <div className="dyn-fields">
            {secilenTip.fields.map((field) => {
              const inputId = `alan-${field.key}`;
              const genisSutun = field.type === "textarea";
              return (
                <div className={`field${genisSutun ? " span-2" : ""}`} key={field.key}>
                  <label htmlFor={inputId}>
                    {field.label} {field.required && <span className="req">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select
                      id={inputId}
                      value={degerler[field.key] ?? ""}
                      onChange={(e) => alanDegistir(field.key, e.target.value)}
                      required={field.required}
                    >
                      <option value="" disabled>
                        Seçin
                      </option>
                      {(secilenTip?.ad === "Hastalık / Zararlı" && field.key === "etken"
                        ? hastalikTanimlari.map((h) => h.ad)
                        : field.options ?? []
                      ).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={inputId}
                      rows={3}
                      value={degerler[field.key] ?? ""}
                      onChange={(e) => alanDegistir(field.key, e.target.value)}
                      required={field.required}
                    />
                  ) : (
                    <input
                      id={inputId}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={degerler[field.key] ?? ""}
                      onChange={(e) => alanDegistir(field.key, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {secilenTip && secilenTip.fields.length === 0 && <p className="dyn-note">Bu kayıt tipinin ek alanı yok.</p>}

        <div className="field">
          <label htmlFor="kayit-not">Not (opsiyonel)</label>
          <textarea id="kayit-not" name="not" rows={3} />
        </div>
      </section>

      <div className="wizard-actions">
        <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}`} className="btn">
          Vazgeç
        </Link>
        <button type="submit" className="btn btn-primary">
          Kaydet
        </button>
      </div>
    </form>
  );
}
