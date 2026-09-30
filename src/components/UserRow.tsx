"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateUserAction, deleteUserAction, type UserFormState } from "@/lib/actions";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { Icon } from "./IconSprite";
import type { User } from "@/types";

const initialState: UserFormState = null;

export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const boundAction = updateUserAction.bind(null, user.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) setEditing(false);
    wasPending.current = pending;
  }, [pending, state]);

  const initials = user.ad
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (!editing) {
    return (
      <tr>
        <td>
          <div className="cust-cell">
            <div className="cust-avatar">{initials}</div>
            <div>
              <div className="name">
                {user.ad}
                {isSelf && <span style={{ color: "var(--muted)", fontWeight: 400 }}> (siz)</span>}
              </div>
            </div>
          </div>
        </td>
        <td>{user.email}</td>
        <td>
          <span className="admin-tag" style={user.rol === "admin" ? undefined : { background: "var(--paper)", color: "var(--ink-2)" }}>
            {user.rol === "admin" ? "Yönetici" : "Ziraat Mühendisi"}
          </span>
        </td>
        <td>
          <div className="row-actions">
            <button type="button" className="icon-btn" title="Düzenle" onClick={() => setEditing(true)}>
              <Icon name="edit" />
            </button>
            {!isSelf && (
              <ConfirmDeleteButton
                action={deleteUserAction.bind(null, user.id)}
                basariliMesaj={`"${user.ad}" kullanıcısı silindi.`}
                message={
                  <>
                    &quot;<strong>{user.ad}</strong>&quot; kullanıcısını silmek istediğinize emin misiniz?
                  </>
                }
              />
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={4}>
        <form
          action={formAction}
          className="soru-row-form"
          style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1fr 1fr auto", gap: 10, alignItems: "center" }}
        >
          {state?.error && (
            <div className="banner crit" style={{ gridColumn: "1 / -1" }}>
              {state.error}
            </div>
          )}
          <input name="ad" defaultValue={user.ad} required placeholder="Ad Soyad" />
          <input name="email" type="email" defaultValue={user.email} required placeholder="E-posta" />
          <select name="rol" defaultValue={user.rol}>
            <option value="muhendis">Ziraat Mühendisi</option>
            <option value="admin">Yönetici</option>
          </select>
          <input name="password" type="password" placeholder="Yeni şifre (opsiyonel)" autoComplete="new-password" />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
