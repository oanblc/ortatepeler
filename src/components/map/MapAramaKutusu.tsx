"use client";

import { useState } from "react";
import { Icon } from "@/components/IconSprite";
import { MAPBOX_TOKEN } from "@/lib/geo";
import type { LatLng } from "@/types";

export function MapAramaKutusu({ onSonucSecildi }: { onSonucSecildi: (merkez: LatLng) => void }) {
  const [sorgu, setSorgu] = useState("");
  const [ariyor, setAriyor] = useState(false);
  const [hata, setHata] = useState("");

  // "36.910199, 35.372677" gibi enlem,boylam çiftini yakalar — Google Maps'ten
  // kopyalanan koordinatlar doğrudan bu formatta yapıştırılabilsin diye.
  const koordinatAyikla = (metin: string): LatLng | null => {
    const eslesme = metin.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!eslesme) return null;
    const lat = Number(eslesme[1]);
    const lng = Number(eslesme[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  };

  const ara = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sorgu.trim()) return;
    setAriyor(true);
    setHata("");
    try {
      const koordinat = koordinatAyikla(sorgu);
      if (koordinat) {
        onSonucSecildi(koordinat);
        return;
      }

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(sorgu)}.json?access_token=${MAPBOX_TOKEN}&country=tr&language=tr&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const ilkSonuc = data.features?.[0];
      if (!ilkSonuc) {
        setHata("Sonuç bulunamadı.");
        return;
      }
      const [lng, lat] = ilkSonuc.center;
      onSonucSecildi({ lat, lng });
    } catch {
      setHata("Arama başarısız oldu.");
    } finally {
      setAriyor(false);
    }
  };

  return (
    <form onSubmit={ara} className="map-search">
      <div className="map-search-box">
        <Icon name="search" />
        <input
          type="text"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          placeholder="Adres, yer veya enlem, boylam ara..."
        />
        <button type="submit" disabled={ariyor}>
          {ariyor ? "..." : "Ara"}
        </button>
      </div>
      {hata && <div className="map-search-error">{hata}</div>}
    </form>
  );
}
