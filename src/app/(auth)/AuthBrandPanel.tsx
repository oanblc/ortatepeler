import Link from "next/link";

export function AuthBrandPanel({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="auth-brand">
      <div className="rows" aria-hidden="true">
        <svg viewBox="0 0 400 700" preserveAspectRatio="none">
          <g stroke="#20392a" strokeWidth="1.5" fill="none">
            <path d="M-20 60 C 100 20, 300 100, 420 40" />
            <path d="M-20 130 C 100 90, 300 170, 420 110" />
            <path d="M-20 200 C 100 160, 300 240, 420 180" />
            <path d="M-20 270 C 100 230, 300 310, 420 250" />
            <path d="M-20 340 C 100 300, 300 380, 420 320" />
            <path d="M-20 410 C 100 370, 300 450, 420 390" />
            <path d="M-20 480 C 100 440, 300 520, 420 460" />
            <path d="M-20 550 C 100 510, 300 590, 420 530" />
            <path d="M-20 620 C 100 580, 300 660, 420 600" />
          </g>
        </svg>
      </div>
      <img src="/ortatepeler-logo-white.png" alt="" aria-hidden="true" className="filigran" />
      <Link href="/giris" className="top">
        <img src="/ortatepeler-logo.png" alt="Ortatepeler Zirai Danışmanlık" className="top-logo" />
      </Link>
      <div className="mid">
        <h1>{heading}</h1>
        <p>{body}</p>
      </div>
      <div className="chips">
        <span className="chip">
          <svg className="icon">
            <use href="#i-sprout" />
          </svg>
          Gübreleme
        </span>
        <span className="chip">
          <svg className="icon">
            <use href="#i-droplet" />
          </svg>
          Sulama
        </span>
        <span className="chip">
          <svg className="icon">
            <use href="#i-eye" />
          </svg>
          Gözlem
        </span>
        <span className="chip">
          <svg className="icon">
            <use href="#i-thermometer" />
          </svg>
          Isı Toplamı
        </span>
      </div>
    </div>
  );
}
