"use client";

import { useState } from "react";
import Link from "next/link";

type Musteri = { id: string; ad: string; adres: string; parselSayisi: number };

export function MusteriListesi({ musteriler }: { musteriler: Musteri[] }) {
  const [q, setQ] = useState("");
  const aranan = q.trim().toLocaleLowerCase("tr");
  const liste = aranan ? musteriler.filter((m) => `${m.ad} ${m.adres}`.toLocaleLowerCase("tr").includes(aranan)) : musteriler;
  return (
    <>
      <input className="sh-ara" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri ara…" aria-label="Müşteri ara" />
      {musteriler.length === 0 && <p className="sh-bos">Size atanmış müşteri yok. Yönetici ile iletişime geçin.</p>}
      {musteriler.length > 0 && liste.length === 0 && <p className="sh-bos">Aramayla eşleşen müşteri yok.</p>}
      <ul className="sh-liste">
        {liste.map((m) => (
          <li key={m.id}>
            <Link href={`/saha/${m.id}`} className="sh-kart">
              <span className="sh-kart-ad">{m.ad}</span>
              <span className="sh-kart-alt">
                {m.parselSayisi} parsel{m.adres ? ` · ${m.adres}` : ""}
              </span>
              <span className="sh-ok" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
