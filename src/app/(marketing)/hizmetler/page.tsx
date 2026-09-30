import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, CheckIcon, SERVICES, CROPS, PARSEL_ROWS } from "../_shared";

export const metadata: Metadata = {
  title: "Hizmetlerimiz | Ortatepeler Zirai Danışmanlık",
  description: "Sulama danışmanlığı, gübreleme ve beslenme, hastalık ve zararlı takibi, saha ziyaretleri, fenolojik takip ve sezon sonu değerlendirmesi — altı hizmet alanı, tek kayıt sistemi.",
};

export default function HizmetlerPage() {
  return (
    <>
      <section className="ot-section">
        <div className="ot-wrap ot-services-layout">
          <div className="ot-services-side">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span className="ot-eyebrow">Hizmetlerimiz</span>
              <h2 style={{ margin: 0, font: "700 38px/1.12 var(--font-display)", letterSpacing: "-0.02em" }}>
                Bahçe yönetiminin her aşamasında danışmanlık
              </h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--ink-2)" }}>
                Altı hizmet alanımız aynı kayıt sistemi üzerinden yürütülür. Bu kayıtlar haftalık raporunuzda
                doğrudan görünür.
              </p>
            </div>
            <div className="ot-services-promo">
              <div className="ot-services-promo-check">
                <CheckIcon />
                Tek kayıt sistemi
              </div>
              <div className="ot-services-promo-check">
                <CheckIcon />
                Parsel bazlı program
              </div>
              <div className="ot-services-promo-check">
                <CheckIcon />
                Haftalık rapor
              </div>
              <Link className="ot-btn ot-btn-brand" href="/iletisim" style={{ marginTop: 4 }}>
                <span>Saha Ziyareti Talep Edin</span>
                <ArrowIcon />
              </Link>
            </div>
          </div>
          <div className="ot-servicegrid">
            {SERVICES.map((s) => (
              <div key={s.no} className="ot-service">
                <img className="ot-service-bg" src={s.image} alt="" aria-hidden="true" />
                <span className="ot-service-no">{s.no}</span>
                <div className="ot-service-icon">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {s.icon}
                  </svg>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BAHÇEYE ÖZEL PROGRAM */}
      <section style={{ padding: "112px 0", background: "var(--paper)" }}>
        <div className="ot-wrap ot-crop-layout">
          <div className="ot-crop-copy">
            <span className="ot-eyebrow">Bahçeye Özel Program</span>
            <h2 style={{ margin: 0, font: "700 42px/1.12 var(--font-display)", letterSpacing: "-0.02em" }}>
              Programı bahçenizdeki tür ve çeşide göre hazırlıyoruz
            </h2>
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: "var(--ink-2)" }}>
              Belirli ürünlerle sınırlı çalışmıyoruz. İlk saha ziyaretinde her parselin türü, çeşidi, toprak yapısı
              ve altyapısı kayıt altına alınır; sulama, gübreleme ve takip programı bu bilgilere göre hazırlanır.
            </p>
            <div className="ot-parselcard">
              <div className="ot-parselcard-head">
                <div className="ot-parselcard-head-left">
                  <div className="ot-parselcard-icon">
                    <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6h11M9 12h11M9 18h11" />
                      <circle cx="4.5" cy="6" r="1" />
                      <circle cx="4.5" cy="12" r="1" />
                      <circle cx="4.5" cy="18" r="1" />
                    </svg>
                  </div>
                  <b>Parsel künyesi</b>
                </div>
                <span>P-__</span>
              </div>
              {PARSEL_ROWS.map((row) => (
                <div key={row.k} className="ot-parselcard-row">
                  <span className="k">{row.k}</span>
                  <span className="v">{row.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="ot-cropgrid-label">Hizmet verdiğimiz bahçelerden örnekler</span>
            <div className="ot-cropgrid">
              {CROPS.map((crop) => (
                <div key={crop.name} className="ot-cropcard">
                  <div className="ot-cropcard-art">
                    <img src={crop.image} alt={crop.name} />
                  </div>
                  <div className="ot-cropcard-name">
                    <b>{crop.name}</b>
                    <i>{crop.latin}</i>
                  </div>
                </div>
              ))}
            </div>
            <p className="ot-cropgrid-more">Autumn Gold, Miho, Fukumoto, Ortanique ve çok daha fazlası…</p>
          </div>
        </div>
      </section>
    </>
  );
}
