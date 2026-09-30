"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "@/lib/actions";

const initialState: ResetPasswordState = null;

export function ResetPasswordForm({ token }: { token: string }) {
  const boundAction = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction}>
      {state?.error && <div className="a-error">{state.error}</div>}
      <div className="a-field">
        <label htmlFor="new-pass">Yeni şifre</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-lock" />
          </svg>
          <input id="new-pass" name="password" type="password" required minLength={8} placeholder="••••••••" autoComplete="new-password" />
        </div>
      </div>
      <div className="a-field">
        <label htmlFor="new-pass2">Yeni şifre (tekrar)</label>
        <div className="input-wrap">
          <svg className="icon">
            <use href="#i-lock" />
          </svg>
          <input id="new-pass2" name="password2" type="password" required minLength={8} placeholder="••••••••" autoComplete="new-password" />
        </div>
      </div>
      <button className="a-submit" type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Şifreyi güncelle"}
      </button>
    </form>
  );
}
