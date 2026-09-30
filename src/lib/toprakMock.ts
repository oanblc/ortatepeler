// Toprak/topraq.ai parsel eşleştirmesi henüz yok (ayrı, gelecekteki bir aşama) —
// bu yüzden toprak grafikleri şimdilik parsel id'sine göre DETERMİNİSTİK, sahte
// bir veri seti üretir (sayfa her açıldığında aynı görünüm çıksın diye). Gerçek
// entegrasyon geldiğinde bu dosya tamamen kaldırılıp yerine gerçek bir API
// çağrısı gelecek — grafik bileşenleri bunun farkında olduğu için "Örnek veri"
// rozetini gösteriyor.

export interface ToprakGunlukVeri {
  tarih: string; // ISO gün (YYYY-MM-DD)
  nem20: number;
  nem40: number;
  nem60: number;
  nem80: number;
  nemAgirlikli: number;
  tempMin: number;
  tempMax: number;
  bagilNem: number;
}

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// mulberry32 — küçük, hızlı, tohumdan deterministik üretim yapan PRNG.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const GUN_MS = 24 * 60 * 60 * 1000;

// Belirli bir parsel için 90 günlük örnek toprak/hava verisi üretir. Sonuç
// eskiden yeniye sıralıdır (index 0 = 90 gün önce, son eleman = bugün).
export function ornekToprakVerisiUret(parcelId: string, gunSayisi = 90): ToprakGunlukVeri[] {
  const rnd = mulberry32(hashSeed(`toprak-${parcelId}`));
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const veriler: ToprakGunlukVeri[] = [];

  // Mevsimsel taban + yavaş rastgele yürüyüş (random walk) ile "gerçekçi" ama
  // tamamen uydurma bir eğri — ani sıçramalar olmasın diye her gün bir önceki
  // güne göre küçük adımlarla değişir.
  let nem20 = 38 + rnd() * 6;
  let nem40 = 42 + rnd() * 5;
  let nem60 = 45 + rnd() * 4;
  let nem80 = 47 + rnd() * 4;
  let tempTaban = 24 + rnd() * 4;
  let bagilNemTaban = 55 + rnd() * 10;

  for (let i = gunSayisi - 1; i >= 0; i--) {
    const tarih = new Date(bugun.getTime() - i * GUN_MS);

    // Sulama olayı gibi görünen ara sıra ani yükselişler + zamanla düşüş —
    // yüzeye yakın katmanlar (20cm) daha oynak, derin katmanlar (80cm) daha durağan.
    const sulamaOlayi = rnd() < 0.12 ? rnd() * 10 : 0;
    nem20 = clamp(nem20 + (rnd() - 0.52) * 2.2 + sulamaOlayi, 18, 62);
    nem40 = clamp(nem40 + (rnd() - 0.51) * 1.6 + sulamaOlayi * 0.6, 22, 60);
    nem60 = clamp(nem60 + (rnd() - 0.5) * 1.1 + sulamaOlayi * 0.35, 26, 58);
    nem80 = clamp(nem80 + (rnd() - 0.5) * 0.7 + sulamaOlayi * 0.18, 28, 56);

    // Ağırlıklı ortalama — yüzeye yakın katmanlar daha az, derin katmanlar
    // daha çok ağırlık taşır (kök bölgesi temsilinde yaygın yaklaşım).
    const nemAgirlikli = nem20 * 0.15 + nem40 * 0.25 + nem60 * 0.3 + nem80 * 0.3;

    tempTaban = clamp(tempTaban + (rnd() - 0.5) * 1.8, 8, 40);
    const tempMax = tempTaban + 4 + rnd() * 4;
    const tempMin = tempTaban - 4 - rnd() * 3;

    bagilNemTaban = clamp(bagilNemTaban + (rnd() - 0.5) * 6, 25, 92);

    veriler.push({
      tarih: tarih.toISOString().slice(0, 10),
      nem20: Math.round(nem20 * 10) / 10,
      nem40: Math.round(nem40 * 10) / 10,
      nem60: Math.round(nem60 * 10) / 10,
      nem80: Math.round(nem80 * 10) / 10,
      nemAgirlikli: Math.round(nemAgirlikli * 10) / 10,
      tempMin: Math.round(tempMin * 10) / 10,
      tempMax: Math.round(tempMax * 10) / 10,
      bagilNem: Math.round(bagilNemTaban * 10) / 10,
    });
  }

  return veriler;
}

export function formatKisaTarih(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function formatUzunTarih(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
