import type { Metadata } from "next";
import { CheckIcon, PROCESS_PHASES, CYCLE_STEPS } from "../_shared";

export const metadata: Metadata = {
  title: "Nasıl Çalışırız | Ortatepeler Zirai Danışmanlık",
  description: "Sezon başından sonuna kadar izlediğimiz düzenli çalışma süreci: saha analizi, program oluşturma, düzenli ziyaret ve haftalık raporlama.",
};

export default function SurecPage() {
  return (
    <section className="ot-section ot-section-striped">
      <div className="ot-wrap" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 680 }}>
          <span className="ot-eyebrow">Çalışma Sürecimiz</span>
          <h2 style={{ margin: 0, font: "700 44px/1.12 var(--font-display)", letterSpacing: "-0.02em" }}>
            Sezon boyunca nasıl çalışıyoruz?
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--ink-2)" }}>
            Süreç, bahçenin yerinde incelenmesiyle başlar. Sezon içinde düzenli saha ziyaretleri ve haftalık
            raporlama ile devam eder; sezon sonunda yapılan değerlendirme bir sonraki yılın programına esas
            alınır.
          </p>
        </div>
        <div className="ot-process-grid">
          {PROCESS_PHASES.map((phase) => (
            <div key={phase.title} className="ot-process-card">
              <div className={`ot-process-card-head${phase.active ? " is-active" : ""}`}>
                <div className="ot-process-card-icon">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {phase.icon}
                  </svg>
                </div>
                <div>
                  <span>{phase.stage}</span>
                  <b>{phase.title}</b>
                </div>
              </div>
              <div className="ot-process-card-body">
                {phase.steps.map((step) => (
                  <div key={step.title} className="ot-process-step">
                    <CheckIcon />
                    <div>
                      <b>{step.title}</b>
                      <div>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="ot-cycle-strip">
          <span className="ot-cycle-strip-label">Sezon içinde her hafta</span>
          <div className="ot-cycle-steps">
            {CYCLE_STEPS.map((step, i) => (
              <div key={step.label} className="ot-cycle-step">
                <div className="ot-cycle-step-icon">
                  <svg className="ot-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {step.icon}
                  </svg>
                </div>
                <span>{step.label}</span>
                {i < CYCLE_STEPS.length - 1 && (
                  <svg className="ot-icon chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
