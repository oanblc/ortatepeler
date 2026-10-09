"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions";

const initialState: LoginState = null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction}>
      {state?.error && <div className="a-error">{state.error}</div>}
      <div className="a-field">
        <label htmlFor="l-email">E-posta</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-mail" />
          </svg>
          <input id="l-email" name="email" type="email" required defaultValue={state?.email ?? ""} placeholder="ad.soyad@ortatepeler.com" autoComplete="email" />
        </div>
      </div>
      <div className="a-field">
        <label htmlFor="l-pass">Şifre</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-lock" />
          </svg>
          <input id="l-pass" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
        </div>
      </div>
      <div className="a-field-foot">
        <span className="remember">
          <input type="checkbox" id="remember" name="remember" />
          <label htmlFor="remember">Beni hatırla</label>
        </span>
        <a href="/sifremi-unuttum">Şifremi unuttum</a>
      </div>
      <button className="a-submit" type="submit" disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
      {/* Mobil uygulama çıkana kadar geçici: sahada telefondan ziyaret kaydı girmek için (PWA, /saha). */}
      <button className="a-submit-ghost" type="submit" name="hedef" value="saha" disabled={pending}>
        Saha girişi — ziyaret kaydı gir
      </button>
      <p className="a-saha-not">Telefonda uygulama gibi kullanmak için giriş sonrası &quot;Ana Ekrana Ekle&quot; deyin.</p>
    </form>
  );
}
