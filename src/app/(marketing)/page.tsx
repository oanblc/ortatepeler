import Link from "next/link";
import { ArrowIcon, HERO_MARKERS, HERO_PINS, INFO_ITEMS } from "./_shared";

const QUICK_LINKS = [
  {
    href: "/hizmetler",
    title: "Hizmetlerimiz",
    desc: "Sulama, gübreleme, hastalık takibi ve daha fazlası — altı alan, tek kayıt sistemi.",
    icon: (
      <>
        <path d="M12 8.5a4 4 0 0 1 4 4v3.5a4 4 0 0 1-8 0V12.5a4 4 0 0 1 4-4Z" />
        <path d="M9 9l-2.5-2.5M15 9l2.5-2.5" />
        <circle cx="12" cy="5" r="1.3" />
      </>
    ),
  },
  {
    href: "/surec",
    title: "Nasıl Çalışırız",
    desc: "Sezon başından sonuna kadar izlediğimiz düzenli, öngörülebilir bir akış.",
    icon: <path d="M13 3 5 13.5h5.5L10 21l8-10.5h-5.5L13 3Z" />,
  },
  {
    href: "/dijital-takip",
    title: "Dijital Takip",
    desc: "Saha kayıtlarından otomatik oluşan haftalık raporlar ve parsel bazlı uyum skoru.",
    icon: (
      <>
        <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
        <path d="M9 4v13M15 7v13" />
      </>
    ),
  },
  {
    href: "/sss",
    title: "Sık Sorulan Sorular",
    desc: "Bölge, ürün kapsamı, uyum skoru ve raporlama sıklığıyla ilgili merak edilenler.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.2c.3-1 1.2-1.7 2.5-1.7 1.4 0 2.4.8 2.4 2 0 1.6-2.4 1.7-2.4 3.3" />
        <circle cx="12" cy="16.3" r="0.2" fill="currentColor" />
      </>
    ),
  },
];

export default function AnasayfaPage() {
  return (
    <>
      {/* HERO */}
      <section className="ot-hero">
        <img className="ot-hero-img" src="/anasayfa-hero.jpg" alt="Sıra ekili parsellerin kuş bakışı görüntüsü" />
        <div className="ot-hero-scrim" />
        {HERO_MARKERS.map((m) => (
          <div key={m.tag} className="ot-hero-marker" style={{ left: m.left, top: m.top, width: m.width, height: m.height }}>
            <span>{m.tag}</span>
          </div>
        ))}
        {HERO_PINS.map((p) => (
          <div key={p.kicker} className="ot-hero-pin" style={{ left: p.left, top: p.top }}>
            <div className="ot-hero-pin-dot" />
            <div className="ot-hero-pin-line" />
            <div className="ot-hero-pin-card">
              <em>{p.kicker}</em>
              <b>{p.title}</b>
              <small>{p.note}</small>
            </div>
          </div>
        ))}
        <span className="ot-hero-sample-badge">ÖRNEK İŞARETLEME</span>
        <div className="ot-hero-inner">
          <div className="ot-hero-content">
            <span className="ot-hero-kicker">Ortatepeler Zirai Danışmanlık</span>
            <h1>Bahçeler için parsel bazlı zirai danışmanlık</h1>
            <p>
              Sulama, gübreleme ve hastalık-zararlı takibini her parsel için ayrı ayrı planlıyoruz. Saha
              ziyaretlerindeki gözlem ve uygulamalar kayıt altına alınır, haftalık raporla size iletilir.
            </p>
            <div className="ot-hero-actions">
              <Link className="ot-btn ot-btn-brand" href="/iletisim">
                <span>Saha Ziyareti Talep Edin</span>
                <ArrowIcon />
              </Link>
              <Link className="ot-btn ot-btn-ondark" href="/dijital-takip">
                <span>Örnek Raporu İnceleyin</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <div className="ot-infostrip">
        <div className="ot-wrap ot-infostrip-grid">
          {INFO_ITEMS.map((item) => (
            <div key={item.no} className="ot-infostrip-item">
              <span>{item.no} · {item.label}</span>
              <b>{item.value}</b>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK LINKS */}
      <section className="ot-section">
        <div className="ot-wrap">
          <div className="ot-section-head">
            <span className="ot-eyebrow">Sitede Neler Var</span>
            <h2>Danışmanlığımızı daha yakından tanıyın</h2>
          </div>
          <div className="ot-quicklinks-grid">
            {QUICK_LINKS.map((q) => (
              <Link key={q.href} href={q.href} className="ot-quicklink-card">
                <div className="ot-quicklink-icon">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {q.icon}
                  </svg>
                </div>
                <h3>{q.title}</h3>
                <p>{q.desc}</p>
                <span className="ot-quicklink-more">
                  İncele
                  <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ot-section" style={{ paddingTop: 0 }}>
        <div className="ot-wrap">
          <div className="ot-cta-card ot-cta-card-standalone">
            <img src="/anasayfa-cta.jpg" alt="Gün doğumunda sıra ekili tarla" />
            <div className="ot-cta-card-scrim" />
            <div className="ot-cta-card-body">
              <h3>Saha ziyareti için bize ulaşın</h3>
              <p>Bahçenizi yerinde inceleyip size uygun programı birlikte planlayalım.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="ot-btn ot-btn-light" href="tel:+905054286598">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.5 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1 1.5 1.5 0 0 1 6.5 3.5Z" />
                  </svg>
                  <span>0505 428 65 98</span>
                </a>
                <Link className="ot-btn ot-btn-ondark" href="/iletisim">
                  <span>İletişim Formu</span>
                </Link>
              </div>
              <span className="ot-cta-card-address">
                <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" />
                  <circle cx="12" cy="9" r="2.4" />
                </svg>
                Adana / Seyhan
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
