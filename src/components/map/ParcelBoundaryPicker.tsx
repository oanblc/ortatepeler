"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { MAPBOX_TOKEN, DEFAULT_CENTER, polygonAreaDonum } from "@/lib/geo";
import { MapboxTokenNotice } from "./MapboxTokenNotice";
import { MapAramaKutusu } from "./MapAramaKutusu";
import { Icon } from "@/components/IconSprite";
import type { LatLng } from "@/types";

// Yeni parsel oluşturma akışında haritayı ilk adıma taşır: henüz veritabanında
// bir parcelId yoktur, bu yüzden çizilen sınırı sadece yerel state'te tutar,
// "Devam Et" ile üst bileşene (ParselEkleWizard) teslim eder.
export function ParcelBoundaryPicker({
  initialSinir,
  onDevamEt,
  bilgiBandiGoster = true,
}: {
  initialSinir?: LatLng[];
  onDevamEt: (sinir: LatLng[], alanDonum: number) => void;
  /** Parsel Detayı sayfasında aynı metin haritanın altında zaten gösterildiği için orada false geçilir. */
  bilgiBandiGoster?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [sinir, setSinir] = useState<LatLng[] | null>(initialSinir && initialSinir.length >= 3 ? initialSinir : null);
  // Mevcut sınır yüklendiğinde (initialSinir) buton pasif kalsın — kullanıcı
  // çizim aracıyla gerçekten bir değişiklik yapınca (draw.create/update/delete) true olur.
  const [degisti, setDegisti] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center = initialSinir?.[0] ?? DEFAULT_CENTER;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [center.lng, center.lat],
      zoom: initialSinir ? 16 : 13,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: initialSinir && initialSinir.length >= 3 ? "simple_select" : "draw_polygon",
    });
    map.addControl(draw, "top-left");

    const handleChange = () => {
      setDegisti(true);
      const data = draw.getAll();
      const feature = data.features[0];
      if (!feature || feature.geometry.type !== "Polygon") {
        setSinir(null);
        return;
      }
      const ring = feature.geometry.coordinates[0];
      setSinir(ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng })));
    };

    // Yeni bir çokgen çizildiğinde, varsa öncekini (ör. sayfa yüklenince
    // haritaya eklenen mevcut sınır) sil — aynı anda iki sınır olmasın,
    // her zaman en son çizilen tek sınır geçerli olsun.
    const handleCreate = (e: { features: Array<{ id?: string | number }> }) => {
      const yeniIdler = e.features.map((f) => f.id);
      const tumu = draw.getAll();
      const silinecekIdler = tumu.features.map((f) => f.id).filter((id) => !yeniIdler.includes(id));
      if (silinecekIdler.length) draw.delete(silinecekIdler as string[]);
      handleChange();
    };

    map.on("draw.create", handleCreate);
    map.on("draw.update", handleChange);
    map.on("draw.delete", () => {
      setDegisti(true);
      setSinir(null);
    });

    map.on("load", () => {
      if (initialSinir && initialSinir.length >= 3) {
        draw.add({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[...initialSinir.map((p) => [p.lng, p.lat]), [initialSinir[0].lng, initialSinir[0].lat]]],
          },
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!MAPBOX_TOKEN) return <MapboxTokenNotice />;

  const alanDonum = sinir ? polygonAreaDonum(sinir) : 0;

  return (
    <div className="map-draw-root">
      <div ref={containerRef} className="map-draw-canvas" />
      <MapAramaKutusu
        onSonucSecildi={(merkez) => mapRef.current?.flyTo({ center: [merkez.lng, merkez.lat], zoom: 16 })}
      />
      {bilgiBandiGoster && (
        <div className="map-info-banner">Sol üstteki çokgen aracıyla parsel sınırını çizip son noktaya tekrar tıklayarak kapatın.</div>
      )}
      <button
        type="button"
        className="map-save-btn"
        title={
          !degisti
            ? "Kaydetmek için önce sınırı çizin veya düzenleyin"
            : sinir
              ? `Kaydet — ${alanDonum} dönüm`
              : "Kaydetmek için önce bir sınır çizin"
        }
        disabled={!degisti || !sinir}
        onClick={() => degisti && sinir && onDevamEt(sinir, alanDonum)}
      >
        <Icon name="check" />
      </button>
    </div>
  );
}
