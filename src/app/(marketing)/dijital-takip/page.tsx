import type { Metadata } from "next";
import { TAKIP_FEATURES, SAHA_KAYITLARI } from "../_shared";

export const metadata: Metadata = {
  title: "Dijital Takip Sistemi | Ortatepeler Zirai Danışmanlık",
  description: "Haftalık raporlarımız saha kayıtlarından otomatik oluşturulur — anlık kayıt, parsel bazlı takip ve kurumsal antetli raporlama.",
};

export default function DijitalTakipPage() {
  return (
    <section style={{ position: "relative", padding: "112px 0", background: "var(--brand-deep)", overflow: "hidden" }}>
      <div className="ot-wrap ot-takip-layout">
        <div className="ot-takip-copy">
          <span className="ot-eyebrow ot-eyebrow-ondark">Dijital Takip Sistemi</span>
          <h2 style={{ margin: 0, font: "700 44px/1.12 var(--font-display)", letterSpacing: "-0.02em", color: "var(--on-brand)" }}>
            Haftalık raporlar saha kayıtlarından hazırlanır
          </h2>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: "var(--on-dark-lead)" }}>
            Saha ziyaretlerinde girilen kayıtlar kendi takip panelimizde tutulur. Haftalık rapor bu kayıtlardan
            oluşturulur ve planlanan uygulamalarla gerçekleşenler arasındaki farkı gösterir.
          </p>
          <div className="ot-takip-features">
            {TAKIP_FEATURES.map((f) => (
              <div key={f.title} className="ot-takip-feature">
                <div className="ot-takip-feature-icon">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {f.icon}
                  </svg>
                </div>
                <div>
                  <b>{f.title}</b>
                  <div>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="ot-takip-note">
            Takip paneli yalnızca danışmanlık hizmeti verdiğimiz müşterilerimiz için kullanılmaktadır. Görseldeki
            rapor örnek amaçlıdır.
          </p>
        </div>
        <div className="ot-report">
          <div className="ot-report-head">
            <span className="ot-logochip ot-logochip-s">
              <img src="/ortatepeler-logo.png" alt="" />
            </span>
            <span className="ot-report-tag">ÖRNEK RAPOR</span>
          </div>
          <div className="ot-report-gold" />
          <div className="ot-report-body">
            <div className="ot-report-title-row">
              <div>
                <span className="ot-report-eyebrow">Parsel dosyası</span>
                <h4>Parsel P-01 · Mandalina</h4>
                <div className="ot-report-sub">Haftalık saha raporu · örnek hafta</div>
              </div>
              <div style={{ position: "relative", width: 72, height: 72, flex: "none" }}>
                <svg viewBox="0 0 92 92" aria-hidden="true" style={{ width: 72, height: 72 }}>
                  <circle cx="46" cy="46" r="36" fill="none" stroke="var(--brand-tint)" strokeWidth={9} />
                  <circle
                    cx="46"
                    cy="46"
                    r="36"
                    transform="rotate(-90 46 46)"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeDasharray="194.5 226.2"
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }} className="ot-report-donut-label">
                  %86
                </div>
              </div>
            </div>
            <div className="ot-report-chart-box">
              <span className="ot-report-chart-label">Sulama · plan / gerçek</span>
              <svg viewBox="0 0 300 110" aria-hidden="true" style={{ width: "100%", height: 110, display: "block" }}>
                <rect x="6.4" y="8" width="14" height="84" rx="3" fill="none" stroke="var(--brand)" strokeWidth={1.4} strokeDasharray="3 3" />
                <rect x="22.4" y="8" width="14" height="84" rx="3" fill="var(--brand)" />
                <text x="21.4" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Pzt</text>
                <text x="64.3" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Sal</text>
                <rect x="92.1" y="8" width="14" height="84" rx="3" fill="none" stroke="var(--brand)" strokeWidth={1.4} strokeDasharray="3 3" />
                <rect x="108.1" y="18.5" width="14" height="73.5" rx="3" fill="var(--brand)" />
                <text x="107.1" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Çar</text>
                <text x="150" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Per</text>
                <rect x="177.9" y="8" width="14" height="84" rx="3" fill="none" stroke="var(--brand)" strokeWidth={1.4} strokeDasharray="3 3" />
                <rect x="193.9" y="8" width="14" height="84" rx="3" fill="var(--brand)" />
                <text x="192.9" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Cum</text>
                <rect x="236.7" y="71" width="14" height="21" rx="3" fill="var(--amber)" />
                <text x="235.7" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Cmt</text>
                <rect x="263.6" y="8" width="14" height="84" rx="3" fill="none" stroke="var(--brand)" strokeWidth={1.4} strokeDasharray="3 3" />
                <rect x="279.6" y="89" width="14" height="3" rx="1.5" fill="var(--amber)" />
                <text x="278.6" y="107" fontSize="10" fontWeight={600} fill="var(--muted)" textAnchor="middle">Paz</text>
              </svg>
            </div>
            <div>
              <span className="ot-report-records-label">Saha kayıtları</span>
              {SAHA_KAYITLARI.map((k) => (
                <div key={k.date + k.title} className="ot-report-row">
                  <span className="date">{k.date}</span>
                  <div>
                    <div className="title">{k.title}</div>
                    <div className="sub">{k.sub}</div>
                  </div>
                  <span className={`ot-pill ot-pill-${k.tone}`}>{k.pill}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ot-report-foot">
            <span>Ortatepeler Zirai Danışmanlık Ltd. Şti.</span>
            <span>Otomatik oluşturuldu</span>
          </div>
        </div>
      </div>
    </section>
  );
}
