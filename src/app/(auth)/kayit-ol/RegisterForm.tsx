"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/lib/actions";

const initialState: RegisterState = null;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction}>
      {state?.error && <div className="a-error">{state.error}</div>}
      <div className="a-field">
        <label htmlFor="r-name">Ad Soyad</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-user" />
          </svg>
          <input id="r-name" name="ad" type="text" required placeholder="Ayşe Yılmaz" autoComplete="name" />
        </div>
      </div>
      <div className="a-field">
        <label htmlFor="r-email">E-posta</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-mail" />
          </svg>
          <input id="r-email" name="email" type="email" required placeholder="ad.soyad@ortatepeler.com" autoComplete="email" />
        </div>
      </div>
      <div className="a-field-row">
        <div className="a-field">
          <label htmlFor="r-pass">Şifre</label>
          <div className="input-wrap">
            <svg className="icon">
              <use href="#i-lock" />
            </svg>
            <input id="r-pass" name="password" type="password" required minLength={8} placeholder="••••••••" autoComplete="new-password" />
          </div>
        </div>
        <div className="a-field">
          <label htmlFor="r-pass2">Şifre (tekrar)</label>
          <div className="input-wrap">
            <svg className="icon">
              <use href="#i-lock" />
            </svg>
            <input id="r-pass2" name="password2" type="password" required minLength={8} placeholder="••••••••" autoComplete="new-password" />
          </div>
        </div>
      </div>
      <div className="a-check-row">
        <input type="checkbox" id="terms" name="terms" required />
        <label htmlFor="terms">Kullanım koşullarını ve veri işleme ilkelerini kabul ediyorum.</label>
      </div>
      <button className="a-submit" type="submit" disabled={pending}>
        {pending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </button>
    </form>
  );
}
