"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, type UserFormState } from "@/lib/actions";
import { Icon } from "./IconSprite";

const initialState: UserFormState = null;

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="soru-ekle-form" style={{ flexWrap: "wrap" }}>
      {state?.error && (
        <div className="banner crit" style={{ width: "100%" }}>
          {state.error}
        </div>
      )}
      <input name="ad" required placeholder="Ad Soyad" />
      <input name="email" type="email" required placeholder="E-posta" />
      <input name="password" type="password" required placeholder="Şifre (en az 8 karakter)" autoComplete="new-password" />
      <select name="rol" defaultValue="muhendis">
        <option value="muhendis">Ziraat Mühendisi</option>
        <option value="admin">Yönetici</option>
      </select>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Icon name="plus" className="icon" />
        {pending ? "Ekleniyor…" : "Kullanıcı Ekle"}
      </button>
    </form>
  );
}
