"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toast } from "@/components/Toast";
import { useNotifications } from "@/components/NotificationsProvider";

// musteriler/page.tsx server component olduğu için useNotifications'ı doğrudan
// kullanamıyor — bu küçük client sarmalayıcı hem Toast'u (anlık flaş) hem
// bildirim merkezine kaydı üstleniyor. ParcelDetailView.tsx'teki banner temizleme
// deseninin (?queryParam=... birkaç saniye sonra URL'den silinir) aynısı.
export function MusterilerBanner({
  message,
  bildir = true,
}: {
  message: string;
  /**
   * false verilirse bildirim merkezine EKLENMEZ, sadece Toast gösterilir —
   * müşteri silme akışında bildirim ConfirmDeleteButton'da (basariliMesaj) submit
   * anında optimistic olarak zaten eklendiği için burada tekrar eklenip
   * çift kayıt oluşmasın diye.
   */
  bildir?: boolean;
}) {
  const { addNotification } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  // React Strict Mode geliştirme modunda effect'leri iki kez çalıştırır — addNotification
  // gibi tekrarlanabilir olmayan bir yan etki bu ref olmadan aynı mesaj için iki kayıt açardı.
  const bildirilenRef = useRef<string | null>(null);

  useEffect(() => {
    if (bildir && bildirilenRef.current !== message) {
      bildirilenRef.current = message;
      addNotification(message);
    }
    const zamanlayici = setTimeout(() => router.replace(pathname, { scroll: false }), 4000);
    return () => clearTimeout(zamanlayici);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, bildir]);

  return <Toast message={message} />;
}
