"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/IconSprite";

export function AramaKutusu({ baslangic }: { baslangic: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deger, setDeger] = useState(baslangic);

  useEffect(() => {
    const zamanlayici = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const temiz = deger.trim();
      if (temiz) params.set("q", temiz);
      else params.delete("q");
      params.delete("sayfa");
      router.replace(`/musteriler?${params.toString()}`);
    }, 350);
    return () => clearTimeout(zamanlayici);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deger]);

  return (
    <div className="search" style={{ maxWidth: 380, flex: 1 }}>
      <Icon name="search" />
      <input
        type="text"
        value={deger}
        onChange={(e) => setDeger(e.target.value)}
        placeholder="Müşteri adı veya adres ara…"
      />
    </div>
  );
}
