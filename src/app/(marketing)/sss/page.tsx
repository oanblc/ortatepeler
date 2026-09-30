import type { Metadata } from "next";
import Link from "next/link";
import { FAQS } from "../_shared";

export const metadata: Metadata = {
  title: "Sık Sorulan Sorular | Ortatepeler Zirai Danışmanlık",
  description: "Hizmet bölgesi, ürün kapsamı, sulama uyum skoru hesaplaması ve raporlama sıklığı hakkında sık sorulan sorular.",
};

export default function SssPage() {
  return (
    <section className="ot-section">
      <div className="ot-wrap ot-faqcta-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="ot-eyebrow">SSS</span>
            <h2 style={{ margin: 0, font: "700 44px/1.12 var(--font-display)", letterSpacing: "-0.02em" }}>
              Sıkça sorulan sorular
            </h2>
          </div>
          <div className="ot-faq">
            {FAQS.map((faq, i) => (
              <details key={faq.q} className="ot-faq-item" open={i === 0}>
                <summary>
                  {faq.q}
                  <span className="ot-faq-plus">
                    <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="ot-sss-help">
          <div className="ot-sss-help-icon">
            <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.2c.3-1 1.2-1.7 2.5-1.7 1.4 0 2.4.8 2.4 2 0 1.6-2.4 1.7-2.4 3.3" />
              <circle cx="12" cy="16.3" r="0.2" fill="currentColor" />
            </svg>
          </div>
          <h3>Sorunuzu bulamadınız mı?</h3>
          <p>Bahçenize özel bir sorunuz varsa doğrudan bize yazın ya da arayın — size dönüş yapalım.</p>
          <Link className="ot-btn ot-btn-brand" href="/iletisim">
            <span>İletişime Geçin</span>
          </Link>
          <a href="tel:+905054286598" className="ot-sss-help-phone">0505 428 65 98</a>
        </div>
      </div>
    </section>
  );
}
