"use client";

import { useActionState } from "react";
import { submitContactFormAction, type ContactFormState } from "@/app/(marketing)/actions";

const initialState: ContactFormState = null;

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactFormAction, initialState);

  if (state && "sent" in state) {
    return (
      <div className="ot-contact-sent">
        <div className="ot-contact-sent-icon">
          <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
          </svg>
        </div>
        <h3>Mesajınız iletildi</h3>
        <p>En kısa sürede size dönüş yapacağız. Acil durumlar için doğrudan 0505 428 65 98 numarasından ulaşabilirsiniz.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="ot-contact-form">
      {state?.error && <div className="ot-contact-error">{state.error}</div>}
      <div className="ot-field">
        <label htmlFor="c-ad">Ad Soyad</label>
        <input id="c-ad" name="ad" type="text" required placeholder="Adınız Soyadınız" />
      </div>
      <div className="ot-field-row">
        <div className="ot-field">
          <label htmlFor="c-telefon">Telefon</label>
          <input id="c-telefon" name="telefon" type="tel" required placeholder="05xx xxx xx xx" />
        </div>
        <div className="ot-field">
          <label htmlFor="c-eposta">E-posta (opsiyonel)</label>
          <input id="c-eposta" name="eposta" type="email" placeholder="ornek@eposta.com" />
        </div>
      </div>
      <div className="ot-field">
        <label htmlFor="c-mesaj">Mesajınız</label>
        <textarea id="c-mesaj" name="mesaj" required rows={5} placeholder="Bahçenizden ve talebinizden kısaca bahsedin." />
      </div>
      <button className="ot-btn ot-btn-brand" type="submit" disabled={pending}>
        <span>{pending ? "Gönderiliyor…" : "Mesaj Gönder"}</span>
      </button>
    </form>
  );
}
