import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "İletişim | Ortatepeler Zirai Danışmanlık",
  description: "Ortatepeler Zirai Danışmanlık ile iletişime geçin — adres, telefon, e-posta ve saha ziyareti talebi için iletişim formu.",
};

const INFO_ROWS = [
  {
    label: "Adres",
    value: "Gürselpaşa Mah. 75672 Sk. Atagün Sitesi A Blok No:4 İç Kapı No:10, Seyhan / Adana",
    icon: (
      <>
        <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.4" />
      </>
    ),
  },
  {
    label: "Telefon",
    value: "0505 428 65 98",
    href: "tel:+905054286598",
    icon: <path d="M6.5 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1 1.5 1.5 0 0 1 6.5 3.5Z" />,
  },
  {
    label: "E-posta",
    value: "bilgi@ortatepeler.com",
    href: "mailto:bilgi@ortatepeler.com",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 6 8.5 7 8.5-7" />
      </>
    ),
  },
  {
    label: "Vergi Dairesi / No",
    value: "Seyhan · 6481853662",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),
  },
];

export default function IletisimPage() {
  return (
    <section className="ot-section">
      <div className="ot-wrap">
        <div className="ot-section-head">
          <span className="ot-eyebrow">İletişim</span>
          <h2>Bahçenizi konuşalım</h2>
          <p>Saha ziyareti talebi, mevcut danışmanlık sürecinizle ilgili bir soru ya da genel bilgi talebi — aşağıdaki formdan ya da doğrudan telefon/e-posta ile ulaşabilirsiniz.</p>
        </div>
        <div className="ot-contact-layout">
          <div className="ot-contact-info">
            {INFO_ROWS.map((row) => (
              <div key={row.label} className="ot-contact-info-row">
                <div className="ot-contact-info-icon">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {row.icon}
                  </svg>
                </div>
                <div>
                  <span>{row.label}</span>
                  {row.href ? <a href={row.href}>{row.value}</a> : <b>{row.value}</b>}
                </div>
              </div>
            ))}
            <p className="ot-contact-legal">Ortatepeler Zirai Danışmanlık Limited Şirketi</p>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
