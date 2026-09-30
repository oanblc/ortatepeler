import { area } from "@turf/area";
import { polygon } from "@turf/helpers";
import type { LatLng } from "@/types";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Çukurova/Adana bölgesi — parsel konumu bilinmediğinde haritanın açılacağı varsayılan nokta.
export const DEFAULT_CENTER: LatLng = { lat: 37.05, lng: 35.5 };

// 1 dönüm (dekar) = 1000 m² — Türkiye'de tarım arazisi ölçümünde standart birim.
export function polygonAreaDonum(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const ring = points.map((p) => [p.lng, p.lat]);
  ring.push(ring[0]);
  const squareMeters = area(polygon([ring]));
  return Math.round((squareMeters / 1_000) * 10) / 10;
}
