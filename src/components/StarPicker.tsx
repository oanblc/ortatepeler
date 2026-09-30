"use client";

import { useState } from "react";

// 1-5 yıldız puan seçici — parsel-takip'teki PuanSecici.tsx'in birebir portu.
// Tıklanan yıldıza kadar dolar (hover ile önizleme), seçilen değer bir hidden
// input üzerinden native form gönderimine dahil olur (bkz. GenelDegerlendirmeKarti.tsx).
export function StarPicker({ name, baslangic = 0 }: { name: string; baslangic?: number }) {
  const [puan, setPuan] = useState(baslangic);
  const [hover, setHover] = useState(0);
  const gosterilen = hover || puan;

  return (
    <div className="star-row">
      <input type="hidden" name={name} value={puan} />
      {[1, 2, 3, 4, 5].map((n) => {
        const dolu = n <= gosterilen;
        return (
          <button
            key={n}
            type="button"
            onClick={() => setPuan(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} yıldız`}
          >
            <svg className={dolu ? "star-filled" : "star-empty"} viewBox="0 0 24 24">
              <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1 5.9L12 16.7 6.8 19.6l1-5.9-4.3-4.1 5.9-.7L12 3.5Z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
