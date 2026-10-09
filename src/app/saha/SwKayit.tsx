"use client";

import { useEffect } from "react";

// Service worker'ı yalnızca /saha kapsamında kaydeder (public/saha-sw.js).
export function SwKayit() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/saha-sw.js", { scope: "/saha" }).catch(() => {
      // kayıt başarısızsa uygulama yine normal web sayfası gibi çalışır
    });
  }, []);
  return null;
}
