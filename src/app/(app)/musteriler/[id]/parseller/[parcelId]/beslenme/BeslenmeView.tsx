"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import {
  createBeslenmePlaniAction,
  updateBeslenmePlaniAction,
  deleteBeslenmePlaniAction,
  createBeslenmeUygulamaAction,
  deleteBeslenmeUygulamaAction,
} from "@/lib/actions";
import { URUN_BIRIM_PARSEL, type BeslenmeSonucu } from "@/lib/beslenme";
import type { Customer, Parcel, BeslenmePlani, BeslenmeUygulamaKaydi, BeslenmeUrun } from "@/types";

const URUNLER: BeslenmeUrun[] = ["AS21", "MAP", "K2SO4", "H3PO4"];

function formatSayi(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function formatTarih(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function bugun() {
  return new Date().toISOString().slice(0, 10);
}

function PlanFormAlanlari({ plan }: { plan?: BeslenmePlani }) {
  return (
    <>
      <div className="field">
        <label>
          Sezon <span className="req">*</span>
        </label>
        <input name="sezon" type="text" required defaultValue={plan?.sezon ?? String(new Date().getFullYear())} />
      </div>
      <div className="field">
        <label>
          Hedef Azot (kg/ha/yıl) <span className="req">*</span>
        </label>
        <input name="hedefAzotKgHa" type="number" step="0.1" min={0} required defaultValue={plan?.hedefAzotKgHa} />
      </div>
      <div className="npk-grid">
        <div className="field">
          <label>N</label>
          <input name="hedefN" type="number" step="0.1" min={0} required defaultValue={plan?.hedefN ?? 100} />
        </div>
        <div className="field">
          <label>P</label>
          <input name="hedefP" type="number" step="0.1" min={0} required defaultValue={plan?.hedefP} />
        </div>
        <div className="field">
          <label>K</label>
          <input name="hedefK" type="number" step="0.1" min={0} required defaultValue={plan?.hedefK} />
        </div>
      </div>
      <div className="field">
        <label>
          Ağaç Sayısı / ha <span className="req">*</span>
        </label>
        <input name="agacSayisiHa" type="number" step="1" min={1} required defaultValue={plan?.agacSayisiHa} />
      </div>
      <div className="field">
        <label>Not (opsiyonel)</label>
        <textarea name="not" rows={2} defaultValue={plan?.not} />
      </div>
    </>
  );
}

function PlanKarti({
  customer,
  parcel,
  plan,
  sonuc,
  uygulamalar,
  duzenlemeModu,
  duzenlemeyiAc,
  duzenlemeyiKapat,
}: {
  customer: Customer;
  parcel: Parcel;
  plan: BeslenmePlani;
  sonuc: BeslenmeSonucu;
  uygulamalar: BeslenmeUygulamaKaydi[];
  duzenlemeModu: boolean;
  duzenlemeyiAc: () => void;
  duzenlemeyiKapat: () => void;
}) {
  const donemler = Array.from(new Set(sonuc.satirlar.map((s) => s.donem)));
  const silAction = deleteBeslenmePlaniAction.bind(null, customer.id, parcel.id, plan.id);
  const guncelleAction = updateBeslenmePlaniAction.bind(null, customer.id, parcel.id, plan.id);
  const uygulamaEkleAction = createBeslenmeUygulamaAction.bind(null, customer.id, parcel.id, plan.id);

  if (duzenlemeModu) {
    return (
      <div className="card beslenme-plan-karti">
        <div className="beslenme-plan-head">
          <div className="beslenme-plan-baslik">{plan.sezon} Sezonu — Düzenleniyor</div>
        </div>
        <form action={guncelleAction} className="beslenme-plan-form">
          <PlanFormAlanlari plan={plan} />
          <div className="form-actions">
            <button type="button" className="btn" onClick={duzenlemeyiKapat}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card beslenme-plan-karti">
      <div className="beslenme-plan-head">
        <div className="beslenme-plan-baslik">{plan.sezon} Sezonu</div>
        <div className="beslenme-plan-meta">
          <span>Hedef N: {formatSayi(plan.hedefAzotKgHa)} kg/ha</span>
          <span>
            N:P:K = {plan.hedefN}:{plan.hedefP}:{plan.hedefK}
          </span>
          <span>{formatSayi(plan.agacSayisiHa)} ağaç/ha</span>
          <button type="button" className="beslenme-duzenle-btn" onClick={duzenlemeyiAc}>
            <Icon name="edit" />
            Düzenle
          </button>
          <ConfirmDeleteButton
            action={silAction}
            basariliMesaj="Beslenme planı silindi."
            message={
              <>
                &quot;<strong>{plan.sezon} Sezonu</strong>&quot; planı ve bağlı tüm uygulama kayıtları silinsin mi? Bu
                işlem geri alınamaz.
              </>
            }
          />
        </div>
      </div>
      {plan.not && <div className="beslenme-plan-not">{plan.not}</div>}

      <div className="beslenme-alt-baslik">Uygulama Takvimi (ağaç başına)</div>
      <div className="table-scroll">
        <table className="data-table beslenme-takvim-table">
          <thead>
            <tr>
              <th>Dönem</th>
              <th>AS21</th>
              <th>MAP</th>
              <th>H3PO4</th>
              <th>K2SO4</th>
            </tr>
          </thead>
          <tbody>
            {donemler.map((donem) => {
              const satirlar = sonuc.satirlar.filter((s) => s.donem === donem);
              const doz = (urun: BeslenmeUrun) => satirlar.find((s) => s.urun === urun);
              return (
                <tr key={donem}>
                  <td>{donem}</td>
                  <td className="num">{doz("AS21") ? `${formatSayi(doz("AS21")!.dozAgac)} g` : "—"}</td>
                  <td className="num">{doz("MAP") ? `${formatSayi(doz("MAP")!.dozAgac)} g` : "—"}</td>
                  <td className="num">{doz("H3PO4") ? `${formatSayi(doz("H3PO4")!.dozAgac)} cc` : "—"}</td>
                  <td className="num">{doz("K2SO4") ? `${formatSayi(doz("K2SO4")!.dozAgac)} g` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="beslenme-alt-baslik">
        Sezonluk Toplam Alım Miktarı ({formatSayi(sonuc.alanHa)} ha · {formatSayi(sonuc.toplamAgac)} ağaç)
      </div>
      <div className="stat-tile-grid">
        {URUNLER.map((urun) => (
          <div key={urun} className="stat-tile">
            <div className="stat-tile-label">{urun}</div>
            <div className="stat-tile-value">{formatSayi(sonuc.toplamUrunParsel[urun] ?? 0)}</div>
            <div className="stat-tile-unit">{URUN_BIRIM_PARSEL[urun]}</div>
          </div>
        ))}
      </div>

      <div className="beslenme-alt-baslik">Gerçekleşen Uygulamalar</div>
      {uygulamalar.length === 0 ? (
        <div className="beslenme-uygulama-bos">Henüz uygulama girilmedi.</div>
      ) : (
        <div className="beslenme-uygulama-list">
          {uygulamalar.map((uygulama) => (
            <div key={uygulama.id} className="beslenme-uygulama-row">
              <div className="beslenme-uygulama-info">
                <span className="beslenme-uygulama-tarih">{formatTarih(uygulama.tarih)}</span>
                <span className="beslenme-uygulama-detay">
                  {uygulama.urun} · {formatSayi(uygulama.miktarKg)} kg
                </span>
                {uygulama.not && <span className="beslenme-uygulama-not">{uygulama.not}</span>}
              </div>
              <ConfirmDeleteButton
                action={deleteBeslenmeUygulamaAction.bind(null, customer.id, parcel.id, uygulama.id)}
                basariliMesaj="Uygulama kaydı silindi."
                message={<>Bu uygulama kaydı silinsin mi?</>}
              />
            </div>
          ))}
        </div>
      )}

      <form action={uygulamaEkleAction} className="beslenme-uygulama-form">
        <div className="field">
          <label>Tarih</label>
          <input name="tarih" type="date" defaultValue={bugun()} required />
        </div>
        <div className="field">
          <label>Ürün</label>
          <select name="urun" required defaultValue={URUNLER[0]}>
            {URUNLER.map((urun) => (
              <option key={urun} value={urun}>
                {urun}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Miktar (kg)</label>
          <input name="miktarKg" type="number" step="0.1" min={0} required />
        </div>
        <div className="field beslenme-uygulama-form-not">
          <label>Not (opsiyonel)</label>
          <input name="not" type="text" />
        </div>
        <button type="submit" className="btn btn-primary">
          Ekle
        </button>
      </form>
    </div>
  );
}

export function BeslenmeView({
  customer,
  parcel,
  planGorunumleri,
}: {
  customer: Customer;
  parcel: Parcel;
  planGorunumleri: { plan: BeslenmePlani; sonuc: BeslenmeSonucu; uygulamalar: BeslenmeUygulamaKaydi[] }[];
}) {
  const [duzenlenenPlanId, setDuzenlenenPlanId] = useState<string | null>(null);
  const yeniPlanAction = createBeslenmePlaniAction.bind(null, customer.id, parcel.id);

  return (
    <div className="beslenme-layout">
      <div className="beslenme-plan-sutunu">
        {!parcel.alanDonum && (
          <div className="beslenme-uyari">
            Bu parselin alanı (dönüm) tanımlı değil — sezonluk toplam alım miktarı bu yüzden 0 çıkacaktır. Ağaç
            başına dozlar yine de doğru hesaplanır.
          </div>
        )}
        {planGorunumleri.length === 0 ? (
          <div className="card empty-state">
            <Icon name="sprout" className="icon" />
            <p>Henüz beslenme planı yok.</p>
            <p>Sağdaki formdan bir sezon tanımlayarak başlayabilirsin.</p>
          </div>
        ) : (
          planGorunumleri.map(({ plan, sonuc, uygulamalar }) => (
            <PlanKarti
              key={plan.id}
              customer={customer}
              parcel={parcel}
              plan={plan}
              sonuc={sonuc}
              uygulamalar={uygulamalar}
              duzenlemeModu={duzenlenenPlanId === plan.id}
              duzenlemeyiAc={() => setDuzenlenenPlanId(plan.id)}
              duzenlemeyiKapat={() => setDuzenlenenPlanId(null)}
            />
          ))
        )}
      </div>

      <div className="beslenme-yeni-plan card">
        <h3 className="beslenme-yeni-plan-baslik">Yeni Beslenme Planı</h3>
        <p className="beslenme-yeni-plan-aciklama">
          Hedeflenen meyve verimine göre belirlediğin saf azot dozunu (kg/ha) ve bu çeşit için hedeflediğin N:P:K
          oranını gir; AS21/MAP/K2SO4/H3PO4 dozları ve sezonluk toplam alım miktarı otomatik hesaplanır.
        </p>
        <form action={yeniPlanAction} className="beslenme-plan-form">
          <PlanFormAlanlari />
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
