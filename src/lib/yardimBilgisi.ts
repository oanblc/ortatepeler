// Revize panelinde ve Revizeler sayfasında kullanılan sayfa adlandırması.

// Yol -> okunabilir sayfa adı. Dinamik segmentler (id) kalıpla eşleşir.
const SAYFALAR: { desen: RegExp; ad: string }[] = [
  { desen: /^\/panel$/, ad: "Pano" },
  { desen: /^\/musteriler$/, ad: "Müşteriler (liste)" },
  { desen: /^\/musteriler\/yeni$/, ad: "Yeni Müşteri" },
  { desen: /^\/musteriler\/[^/]+\/duzenle$/, ad: "Müşteriyi Düzenle" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/yeni$/, ad: "Yeni Parsel (parsel ekleme sihirbazı)" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/[^/]+\/duzenle$/, ad: "Parseli Düzenle" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/[^/]+\/beslenme$/, ad: "Parsel > Beslenme" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/[^/]+\/fertigasyon$/, ad: "Parsel > Fertigasyon" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/[^/]+\/sulama-uyumu$/, ad: "Parsel > Sulama Uyumu" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/[^/]+\/kayit\/yeni$/, ad: "Parsel > Yeni Saha Kaydı" },
  { desen: /^\/musteriler\/[^/]+\/parseller\/[^/]+$/, ad: "Parsel Detayı" },
  { desen: /^\/musteriler\/[^/]+\/yaprak-gubreleme-plani$/, ad: "Yaprak Gübreleme Planı" },
  { desen: /^\/musteriler\/[^/]+$/, ad: "Müşteri Sayfası (sekmeler: Genel Bilgi, Ziyaret Kaydı, Parseller, Sulama Kuyuları, Uygulamalar, Görevler, Raporlar)" },
  { desen: /^\/gelir-gider$/, ad: "Gelir Gider" },
  { desen: /^\/gelir-gider\/yeni$/, ad: "Gelir Gider > Kayıt Ekle" },
  { desen: /^\/rapor-olustur$/, ad: "Rapor Oluştur" },
  { desen: /^\/kayitlar$/, ad: "Kayıtlar" },
  { desen: /^\/kullanicilar$/, ad: "Kullanıcılar" },
  { desen: /^\/ayarlar$/, ad: "Ayarlar" },
  { desen: /^\/ayarlar\/genel-degerlendirme$/, ad: "Ayarlar > Genel Değerlendirme" },
  { desen: /^\/revizeler$/, ad: "Revizeler" },
];

export function sayfaAdiBul(yol: string): string {
  const temiz = yol.split("?")[0].replace(/\/$/, "") || "/";
  return SAYFALAR.find((s) => s.desen.test(temiz))?.ad ?? temiz;
}
