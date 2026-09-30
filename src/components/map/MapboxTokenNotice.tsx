export function MapboxTokenNotice() {
  return (
    <div className="map-token-notice">
      <div className="map-token-notice-card">
        <div className="title">Harita token&apos;ı eksik</div>
        <div className="desc">
          Haritanın çalışması için <code>.env.local</code> dosyasına{" "}
          <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> değişkeni eklenmeli.
        </div>
      </div>
    </div>
  );
}
