"use client";

import { useState } from "react";
import Link from "next/link";
import { createCustomerAction } from "@/lib/actions";
import { IlgiliKisiRows } from "@/components/IlgiliKisiRows";
import type { IlgiliKisi } from "@/types";

export function NewCustomerForm({ userAdi }: { userAdi: string }) {
  const [ad, setAd] = useState("");
  const [adres, setAdres] = useState("");
  const [ilgiliKisiler, setIlgiliKisiler] = useState<IlgiliKisi[]>([{ ad: "", telefon: "", email: "" }]);
  const gecerliIlgiliKisiler = ilgiliKisiler.filter((k) => k.ad?.trim() || k.telefon?.trim() || k.email?.trim());

  const initials = ad
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="form-layout-panel">
      <form action={createCustomerAction} className="card form-card">
        <div className="field">
          <label htmlFor="ad">
            Müşteri / İşletme Adı <span className="req">*</span>
          </label>
          <input id="ad" name="ad" required value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Arıkoğlu Çiftlik" />
        </div>
        <div className="field">
          <label htmlFor="adres">Adres</label>
          <input id="adres" name="adres" value={adres} onChange={(e) => setAdres(e.target.value)} placeholder="Sarıçam, Adana" />
        </div>
        <IlgiliKisiRows ilgiliKisiler={ilgiliKisiler} onChange={setIlgiliKisiler} />
        <input type="hidden" name="ilgiliKisiler" value={JSON.stringify(gecerliIlgiliKisiler)} readOnly />
        <div className="form-actions">
          <Link href="/musteriler" className="btn">
            Vazgeç
          </Link>
          <button type="submit" className="btn btn-primary">
            Müşteriyi Ekle
          </button>
        </div>
      </form>

      <div className="side-card">
        <div className="card">
          <h3>Liste önizlemesi</h3>
          <div className="preview-row">
            <div className="cust-avatar">{initials || "?"}</div>
            <div>
              <div className="name">{ad || "Yeni müşteri"}</div>
              <div className="addr">{adres || "Adres girilmedi"}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Sonraki adımlar</h3>
          <div className="tip-list">
            <div className="tip-item">
              <span className="tip-num">1</span>Müşteriyi ekleyin — sorumlu mühendis olarak siz ({userAdi}) atanırsınız.
            </div>
            <div className="tip-item">
              <span className="tip-num">2</span>Müşteri detayından ilk parseli ekleyin.
            </div>
            <div className="tip-item">
              <span className="tip-num">3</span>Parsele ilk saha kaydını (gübreleme, sulama, gözlem) girin.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
