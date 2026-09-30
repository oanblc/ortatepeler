"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/lib/actions";

const initialState: ForgotPasswordState = null;

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state && "sent" in state) {
    return (
      <div className="a-confirm">
        <div className="icon-badge">
          <svg className="icon">
            <use href="#i-check" />
          </svg>
        </div>
        <h2>Bağlantı gönderildi</h2>
        <p>Kayıtlıysa aşağıdaki adrese bir sıfırlama bağlantısı gönderdik. Gelen kutunuzu (ve spam klasörünü) kontrol edin.</p>
        <div className="email-chip">{state.email}</div>
        <a className="a-submit-ghost" href="/sifremi-unuttum" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Farklı bir e-posta dene
        </a>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state?.error && <div className="a-error">{state.error}</div>}
      <div className="a-field">
        <label htmlFor="f-email">E-posta</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-mail" />
          </svg>
          <input id="f-email" name="email" type="email" required placeholder="ad.soyad@ortatepeler.com" autoComplete="email" />
        </div>
      </div>
      <button className="a-submit" type="submit" disabled={pending}>
        {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </button>
    </form>
  );
}
