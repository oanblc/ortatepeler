// Saha (PWA) service worker — kapsam: /saha. Amaç: uygulama gibi hızlı açılış ve çevrimdışıyken
// anlaşılır bir ekran. Giriş yapılmış sayfalar (HTML) ASLA önbelleğe alınmaz: eski/başka kullanıcıya
// ait içerik gösterilmesin. Sadece değişmeyen statik dosyalar önbelleğe alınır.
const SURUM = "saha-v1";
const STATIK = ["/saha-icons/icon-192.png", "/saha-icons/icon-512.png", "/ortatepeler-logo.png"];

const CEVRIMDISI_HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bağlantı yok</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;background:#122016;color:#fff;font-family:-apple-system,system-ui,sans-serif}
h1{font-size:20px;margin:0}p{margin:0;color:#b9c8b6;line-height:1.5;max-width:320px}button{margin-top:8px;padding:12px 22px;border:0;border-radius:12px;background:#0e9488;color:#fff;font-size:15px;font-weight:600}</style></head>
<body><h1>İnternet bağlantısı yok</h1><p>Ziyaret kaydı göndermek için internet gerekiyor. Bağlantınız gelince tekrar deneyin.</p><button onclick="location.reload()">Tekrar dene</button></body></html>`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(STATIK)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((anahtarlar) => Promise.all(anahtarlar.filter((a) => a !== SURUM).map((a) => caches.delete(a)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.method !== "GET") return; // sunucu eylemleri (kayıt gönderme) olduğu gibi ağa gider
  const url = new URL(istek.url);
  if (url.origin !== location.origin) return;

  if (istek.mode === "navigate") {
    e.respondWith(fetch(istek).catch(() => new Response(CEVRIMDISI_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }

  // Derlenmiş statik dosyalar (adlarında içerik özeti var) + ikonlar: önce önbellek
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/saha-icons/") || url.pathname === "/ortatepeler-logo.png") {
    e.respondWith(
      caches.match(istek).then(
        (hit) =>
          hit ||
          fetch(istek).then((yanit) => {
            if (yanit.ok) {
              const kopya = yanit.clone();
              caches.open(SURUM).then((c) => c.put(istek, kopya));
            }
            return yanit;
          }),
      ),
    );
  }
});
