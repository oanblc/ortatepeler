"use client";

import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createSulamaPlaniAction, deleteSulamaPlaniAction } from "@/lib/actions";
import type { SulamaUyumSonucu } from "@/lib/sulamaUyumu";
import type { Customer, Parcel, SulamaPlani } from "@/types";

function formatTarih(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatKisaTarih(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
}

function bugun() {
  return new Date().toISOString().slice(0, 10);
}

const GUN_SINIFI: Record<0 | 0.8 | 1, string> = {
  1: "gun-tam",
  0.8: "gun-yakin",
  0: "gun-kacirilan",
};

type PlanGorunumu = { plan: SulamaPlani; sonuc: SulamaUyumSonucu };

function SulamaPlaniKarti({ customer, parcel, plan, sonuc }: { customer: Customer; parcel: Parcel; plan: SulamaPlani; sonuc: SulamaUyumSonucu }) {
  return (
    <div className="card sulama-plan-karti">
      <div className="sulama-plan-head">
        <div>
          <div className="sulama-plan-baslik">
            {formatTarih(plan.donemBaslangic)} – {formatTarih(plan.donemBitis)}
          </div>
          <div className="sulama-plan-not">{sonuc.not}</div>
        </div>
        <div className="sulama-plan-ozet">
          <div className="sulama-skor-kutu">
            <div className="sulama-skor-deger">{sonuc.skor ?? "—"}</div>
            <div className="sulama-skor-etiket">Puan / 10</div>
          </div>
          <div className="sulama-sayaclar">
            <span>{sonuc.planlananGunSayisi} planlanan</span>
            <span className="sulama-sayac-tam">{sonuc.tamGunSayisi} tam</span>
            <span className="sulama-sayac-yakin">{sonuc.yakinGunSayisi} ±1 gün</span>
            <span className="sulama-sayac-kacirilan">{sonuc.kacirilanGunSayisi} kaçırılan</span>
          </div>
          {plan.gundeKacDefa != null && plan.gundeKacSaat != null && (
            <div className="sulama-plan-detay">
              Günde {plan.gundeKacDefa} kez · {plan.gundeKacSaat} saat/sulama
            </div>
          )}
          <ConfirmDeleteButton
            action={deleteSulamaPlaniAction.bind(null, customer.id, parcel.id, plan.id)}
            basariliMesaj="Sulama planı silindi."
            message={<>Bu sulama planı silinsin mi?</>}
          />
        </div>
      </div>
      <div className="sulama-gun-grid">
        {sonuc.gunler.map((g) => (
          <div key={g.tarih} title={`${formatTarih(g.tarih)} · puan ${g.puan}`} className={`gun-cell ${GUN_SINIFI[g.puan]}`}>
            {formatKisaTarih(g.tarih)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SulamaUyumuView({
  customer,
  parcel,
  planGorunumleri,
}: {
  customer: Customer;
  parcel: Parcel;
  planGorunumleri: PlanGorunumu[];
}) {
  const yeniPlanAction = createSulamaPlaniAction.bind(null, customer.id, parcel.id);

  return (
    <div className="beslenme-layout">
      <div className="beslenme-plan-sutunu">
        <div className="sulama-uyumu-toolbar">
          <p>Gerçekleşen sulamayı buradan değil, Kayıtlar&apos;a &quot;Sulama&quot; tipiyle gireceksin.</p>
          <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}/kayit/yeni?tip=Sulama`} className="btn btn-primary">
            <Icon name="plus" className="icon" />
            Sulama Kaydı Ekle
          </Link>
        </div>
        {planGorunumleri.length === 0 ? (
          <div className="card empty-state">
            <Icon name="compare" className="icon" />
            <p>Henüz sulama planı yok.</p>
            <p>Sağdaki formdan bir dönem tanımlayarak başlayabilirsin.</p>
          </div>
        ) : (
          planGorunumleri.map(({ plan, sonuc }) => (
            <SulamaPlaniKarti key={plan.id} customer={customer} parcel={parcel} plan={plan} sonuc={sonuc} />
          ))
        )}
      </div>

      <div className="beslenme-yeni-plan card">
        <h3 className="beslenme-yeni-plan-baslik">Yeni Sulama Planı</h3>
        <p className="beslenme-yeni-plan-aciklama">
          Belirlediğin aralıkla (örn. 3 günde bir) planlanan sulama günleri otomatik oluşturulur.
        </p>
        <form action={yeniPlanAction} className="beslenme-plan-form">
          <div className="field">
            <label>
              Dönem Başlangıç <span className="req">*</span>
            </label>
            <input name="donemBaslangic" type="date" defaultValue={bugun()} required />
          </div>
          <div className="field">
            <label>
              Dönem Bitiş <span className="req">*</span>
            </label>
            <input name="donemBitis" type="date" required />
          </div>
          <div className="field">
            <label>
              Kaç Günde Bir Sulanacak <span className="req">*</span>
            </label>
            <input name="araGun" type="number" step="1" min={1} defaultValue={3} required />
          </div>
          <div className="field-row2">
            <div className="field">
              <label>Günde Kaç Defa (opsiyonel)</label>
              <input name="gundeKacDefa" type="number" step="1" min={1} />
            </div>
            <div className="field">
              <label>Sulama Süresi, saat (opsiyonel)</label>
              <input name="gundeKacSaat" type="number" step="0.5" min={0} />
            </div>
          </div>
          <p className="sulama-form-not">
            Gerçekleşen sulama, bu parsele Kayıtlar&apos;dan girdiğin Sulama kayıtlarının tarihinden alınır.
          </p>
          <div className="form-actions">
            <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}`} className="btn">
              Vazgeç
            </Link>
            <button type="submit" className="btn btn-primary">
              Planı Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
