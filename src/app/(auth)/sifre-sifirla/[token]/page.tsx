import { hashResetToken } from "@/lib/auth";
import { passwordResets } from "@/lib/repositories";
import { AuthBrandPanel } from "../../AuthBrandPanel";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function SifreSifirlaPage(props: PageProps<"/sifre-sifirla/[token]">) {
  const { token } = await props.params;
  const tokenHash = hashResetToken(token);
  const record = (await passwordResets.list()).find((r) => r.tokenHash === tokenHash);
  const gecerli = !!record && !record.used && new Date(record.expiresAt) > new Date();

  return (
    <div className="auth">
      <AuthBrandPanel
        heading="Erişiminizi yeniden kazanın."
        body="Kayıtlı e-posta adresinize bir sıfırlama bağlantısı gönderelim, oradan yeni şifrenizi belirleyin."
      />
      <div className="auth-form-side">
        <div className="auth-form">
          <a className="a-back-link" href="/giris">
            <svg className="icon">
              <use href="#i-arrow-left" />
            </svg>
            Girişe dön
          </a>
          {gecerli ? (
            <>
              <div className="eyebrow">Hesap kurtarma</div>
              <h2>Yeni şifre belirle</h2>
              <p className="lede">Hesabınız için yeni bir şifre girin.</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <div className="a-confirm">
              <div className="icon-badge" style={{ background: "var(--auth-crit-tint)", color: "var(--auth-crit)" }}>
                <svg className="icon">
                  <use href="#i-alert" />
                </svg>
              </div>
              <h2>Bağlantının süresi dolmuş</h2>
              <p>Bu sıfırlama bağlantısı geçersiz, kullanılmış veya süresi dolmuş olabilir. Yeni bir bağlantı isteyin.</p>
              <a className="a-submit-ghost" href="/sifremi-unuttum" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Yeniden sıfırlama iste
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
