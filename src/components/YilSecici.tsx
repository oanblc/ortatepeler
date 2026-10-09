"use client";

import { usePathname, useRouter } from "next/navigation";

// Plan/kayıt sayfalarının üstündeki yıl seçici — ?yil= parametresini değiştirir.
export function YilSecici({ secilen, yiller, kayitli }: { secilen: number; yiller: number[]; kayitli: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="yil-secici">
      <label htmlFor="yil-secici-select">Yıl</label>
      <select id="yil-secici-select" value={secilen} onChange={(e) => router.push(`${pathname}?yil=${e.target.value}`)}>
        {yiller.map((y) => (
          <option key={y} value={y}>
            {y}
            {kayitli.includes(y) ? " · kayıtlı" : ""}
          </option>
        ))}
      </select>
      {!kayitli.includes(secilen) && <span className="yil-secici-not">Bu yıl için kayıt yok.</span>}
    </div>
  );
}
