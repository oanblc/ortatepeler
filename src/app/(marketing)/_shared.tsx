export function CheckIcon() {
  return (
    <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export const HERO_MARKERS = [
  { left: "50%", top: "12%", width: "18%", height: "44%", tag: "P-01" },
  { left: "70%", top: "8%", width: "20%", height: "36%", tag: "P-02" },
  { left: "70%", top: "50%", width: "22%", height: "34%", tag: "P-03" },
];

export const HERO_PINS = [
  { left: "58%", top: "60%", kicker: "SULAMA · P-01", title: "Sulama programı", note: "Parsele özel hazırlanır" },
  { left: "76%", top: "28%", kicker: "GÖZLEM · P-02", title: "Saha gözlemi", note: "Ziyaret tarihiyle kaydedilir" },
  { left: "60%", top: "88%", kicker: "FENOLOJİ", title: "Isı toplamı", note: "Haftalık olarak hesaplanır" },
];

export const INFO_ITEMS = [
  { no: "01", label: "Hizmet bölgesi", value: "Farklı bölgelerdeki bahçeler" },
  { no: "02", label: "Program", value: "Tür ve çeşide göre" },
  { no: "03", label: "Kayıt", value: "Her saha ziyaretinde" },
  { no: "04", label: "Raporlama", value: "Haftalık ve sezon sonu" },
];

export const SERVICES = [
  {
    no: "01",
    title: "Sulama Danışmanlığı",
    desc: "Her parsel için ayrı bir sulama programı hazırlıyoruz. Yapılan sulamayı bu programla karşılaştırıp uyum skorunu çıkarıyoruz, plandan sapma varsa erken fark ediyoruz.",
    image: "/svc-sulama.jpg",
    icon: <path d="M12 3s7 7.5 7 12.5A7 7 0 0 1 5 15.5C5 10.5 12 3 12 3Z" />,
  },
  {
    no: "02",
    title: "Gübreleme ve Beslenme",
    desc: "Toprak ve yaprak gübrelemesiyle fertigasyon programını çeşide ve fenolojik döneme göre kuruyoruz. Her uygulamanın tarihini ve dozunu not ediyoruz.",
    image: "/svc-gubreleme.jpg",
    icon: (
      <>
        <path d="M12 21V12" />
        <path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z" />
        <path d="M12 12c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5Z" />
      </>
    ),
  },
  {
    no: "03",
    title: "Hastalık ve Zararlı Takibi",
    desc: "Düzenli saha taramalarıyla hastalık ve zararlı etkenlerini olabildiğince erken yakalamaya çalışıyoruz. Önerdiğimiz etken madde ve dozu reçete bazında not ediyoruz.",
    image: "/svc-hastalik.jpg",
    icon: (
      <>
        <path d="M12 8.5a4 4 0 0 1 4 4v3.5a4 4 0 0 1-8 0V12.5a4 4 0 0 1 4-4Z" />
        <path d="M9 9l-2.5-2.5M15 9l2.5-2.5" />
        <circle cx="12" cy="5" r="1.3" />
        <path d="M8 13H4.5M8 16.5H4.5M16 13h3.5M16 16.5h3.5" />
      </>
    ),
  },
  {
    no: "04",
    title: "Saha Ziyaretleri ve Gözlem",
    desc: "Parselleri belirlenen aralıklarla ziyaret ediyoruz. Sahada gördüklerimizi ve önerdiğimiz uygulamayı, ziyaret bitmeden sisteme giriyoruz.",
    image: "/svc-saha.jpg",
    icon: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    no: "05",
    title: "Fenolojik Takip (Isı Toplamı)",
    desc: "Haftalık sıcaklık verileriyle kümülatif ısı toplamını (GDD) hesaplıyoruz. Bahçenin hangi gelişim döneminde olduğunu bu rakama bakarak izliyoruz.",
    image: "/svc-fenolojik.jpg",
    icon: (
      <>
        <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" />
        <path d="M12 9v7" />
      </>
    ),
  },
  {
    no: "06",
    title: "Sezon Sonu Değerlendirmesi",
    desc: "Sezon sonunda her parseli tek tek değerlendirip puanlıyoruz. Gelecek sezonun programını bu değerlendirmeye bakarak kuruyoruz.",
    image: "/svc-sezonsonu.jpg",
    icon: <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1 5.9L12 16.7 6.8 19.6l1-5.9-4.3-4.1 5.9-.7L12 3.5Z" />,
  },
];

export const PROCESS_PHASES = [
  {
    stage: "1. Aşama",
    title: "Sezon Başı",
    active: false,
    icon: (
      <>
        <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.4" />
      </>
    ),
    steps: [
      { title: "Saha analizi", desc: "Parseli yerinde geziyoruz; toprak yapısını, çeşidi ve mevcut altyapıyı inceliyoruz." },
      { title: "Programın hazırlanması", desc: "Sulama, gübreleme ve beslenme programını her parsel için ayrı hazırlıyoruz." },
    ],
  },
  {
    stage: "2. Aşama",
    title: "Sezon İçi",
    active: true,
    icon: <path d="M13 3 5 13.5h5.5L10 21l8-10.5h-5.5L13 3Z" />,
    steps: [
      { title: "Düzenli saha ziyareti", desc: "Ziyaret sırasında gördüklerimizi ve yapılan uygulamayı not alıyoruz." },
      { title: "Fenolojik takip", desc: "Isı toplamını her hafta yeniden hesaplıyoruz." },
      { title: "Haftalık raporlama", desc: "Planladığımızla gerçekleşeni karşılaştırıp raporluyoruz." },
    ],
  },
  {
    stage: "3. Aşama",
    title: "Sezon Sonu",
    active: false,
    icon: <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1 5.9L12 16.7 6.8 19.6l1-5.9-4.3-4.1 5.9-.7L12 3.5Z" />,
    steps: [
      { title: "Parsel değerlendirmesi", desc: "Her parseli sezon boyunca tuttuğumuz kayıtlara göre puanlıyoruz." },
      { title: "Yeni sezon planı", desc: "Bu değerlendirmeyi bir sonraki sezonun programına taşıyoruz." },
    ],
  },
];

export const CYCLE_STEPS = [
  { label: "Ziyaret", icon: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></> },
  { label: "Kayıt", icon: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></> },
  { label: "Rapor", icon: <><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M15 3v5h5" /><path d="M8.5 13h7M8.5 17h5" /></> },
  { label: "Değerlendirme", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
];

export const TAKIP_FEATURES = [
  { title: "Anlık kayıt", desc: "Gözlemi ve uygulamayı, tarih ve parsel bilgisiyle birlikte ziyaret sırasında sisteme giriyoruz.", icon: <path d="M13 3 5 13.5h5.5L10 21l8-10.5h-5.5L13 3Z" /> },
  { title: "Parsel bazlı takip", desc: "Her bahçenin programını, geçmiş kayıtlarını ve uyum skorunu kendi dosyasında tutuyoruz.", icon: <><path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" /><path d="M9 4v13M15 7v13" /></> },
  { title: "Antetli raporlar", desc: "Haftalık ve sezon sonu raporlarını kurumsal antetli PDF ya da Excel olarak hazırlıyoruz.", icon: <><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M15 3v5h5" /><path d="M8.5 13h7M8.5 17h5" /></> },
];

export const SAHA_KAYITLARI = [
  { date: "12.09", title: "Sulama", sub: "Plana uygun", pill: "Uyumlu", tone: "good" },
  { date: "14.09", title: "Yaprak gübresi", sub: "Doz ve etken madde kayıtlı", pill: "Kayıtlı", tone: "good" },
  { date: "16.09", title: "Sulama", sub: "Planlanan tarihten 1 gün sonra", pill: "±1 gün", tone: "amber" },
  { date: "18.09", title: "Saha gözlemi", sub: "Uygulama önerisi verildi", pill: "Takipte", tone: "amber" },
] as const;

export const PARSEL_ROWS = [
  { k: "Tür", v: "İlk saha ziyaretinde kaydedilir" },
  { k: "Çeşit", v: "İlk saha ziyaretinde kaydedilir" },
  { k: "Toprak yapısı", v: "Saha analiziyle belirlenir" },
  { k: "Altyapı", v: "Mevcut sulama ve gübreleme sistemi" },
  { k: "Gelişim dönemi", v: "Isı toplamıyla haftalık izlenir" },
];

export const CROPS: { name: string; latin: string; image: string }[] = [
  { name: "Satsuma Mandalina", latin: "Citrus unshiu", image: "/crop-satsuma.jpg" },
  { name: "W. Murcott Mandalina", latin: "Citrus reticulata", image: "/crop-wmurcott.jpg" },
  { name: "Fremont Mandalina", latin: "Citrus reticulata", image: "/crop-fremont.jpg" },
  { name: "Primasol Mandalina", latin: "Citrus reticulata", image: "/crop-primasol.jpg" },
  { name: "Star Ruby Greyfurt", latin: "Citrus × paradisi", image: "/crop-starruby.jpg" },
  { name: "Interdonato Limon", latin: "Citrus limon", image: "/crop-interdonato.jpg" },
];

export const FAQS = [
  {
    q: "Hangi bölgede hizmet veriyorsunuz?",
    a: "Merkezimiz Adana / Seyhan’dadır. Hizmetimiz bu bölgeyle sınırlı değildir; farklı bölgelerdeki bahçelere de danışmanlık veriyoruz.",
  },
  {
    q: "Hangi ürünlerde danışmanlık veriyorsunuz?",
    a: "Belirli bir ürün listesiyle sınırlı değiliz. İlk saha ziyaretinde bahçedeki tür ve çeşit belirlenir, program buna göre hazırlanır.",
  },
  {
    q: "Sulama uyum skoru nasıl hesaplanır?",
    a: "Planlanan sulama tarihleri, gerçekleşen sulama kayıtlarıyla karşılaştırılır. Aynı gün yapılan sulama tam puan, bir gün sapmalı sulama kısmi puan alır; yapılmayan sulama puan almaz. Skor her parsel için ayrı hesaplanır.",
  },
  {
    q: "Raporlar ne sıklıkla paylaşılır?",
    a: "Saha raporları haftalık olarak paylaşılır. Sezon sonunda ayrıca her parselin değerlendirildiği kapsamlı bir rapor hazırlanır.",
  },
  {
    q: "Danışmanlık hangi konuları kapsar?",
    a: "Sulama, gübreleme ve beslenme, hastalık ve zararlı takibi, düzenli saha ziyaretleri, fenolojik takip ve sezon sonu değerlendirmesi hizmet kapsamımızdadır.",
  },
];
