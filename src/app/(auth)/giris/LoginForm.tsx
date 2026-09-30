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
          <input id="l-email" name="email" type="email" required placeholder="ad.soyad@ortatepeler.com" autoComplete="email" />
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
    </form>
  );
}
