"use client";

import { Icon } from "./IconSprite";

// Sağ üstte beliren, birkaç saniye sonra kendiliğinden kaybolan bildirim —
// "Parsel sınırı güncellendi." gibi tam sayfa genişliğinde durmasına gerek
// olmayan, geçici işlem sonuçları için tasarım sistemine uygun toast.
export function Toast({ message }: { message: string }) {
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className="toast toast-good">
        <Icon name="check" />
        <span>{message}</span>
      </div>
    </div>
  );
}
