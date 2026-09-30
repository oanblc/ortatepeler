"use client";

import { useState } from "react";
import Link from "next/link";
import { updateCustomerAction } from "@/lib/actions";
import { IlgiliKisiRows } from "@/components/IlgiliKisiRows";
import type { Customer, IlgiliKisi } from "@/types";

export function EditCustomerForm({ customer }: { customer: Customer }) {
  const action = updateCustomerAction.bind(null, customer.id);
  const [ilgiliKisiler, setIlgiliKisiler] = useState<IlgiliKisi[]>(
    customer.ilgiliKisiler.length > 0 ? customer.ilgiliKisiler.map((k) => ({ ...k })) : [{ ad: "", telefon: "", email: "" }],
  );
  const gecerliIlgiliKisiler = ilgiliKisiler.filter((k) => k.ad?.trim() || k.telefon?.trim() || k.email?.trim());

  return (
    <form action={action} className="card form-card">
      <div className="field">
        <label htmlFor="ad">
          Müşteri / İşletme Adı <span className="req">*</span>
        </label>
        <input id="ad" name="ad" required defaultValue={customer.ad} />
      </div>
      <div className="field">
        <label htmlFor="adres">Adres</label>
        <input id="adres" name="adres" defaultValue={customer.adres} placeholder="Sarıçam, Adana" />
      </div>
      <IlgiliKisiRows ilgiliKisiler={ilgiliKisiler} onChange={setIlgiliKisiler} />
      <input type="hidden" name="ilgiliKisiler" value={JSON.stringify(gecerliIlgiliKisiler)} readOnly />
      <div className="form-actions">
        <Link href="/musteriler" className="btn">
          Vazgeç
        </Link>
        <button type="submit" className="btn btn-primary">
          Kaydet
        </button>
      </div>
    </form>
  );
}
