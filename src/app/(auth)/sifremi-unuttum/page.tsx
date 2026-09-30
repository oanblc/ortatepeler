import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthBrandPanel } from "../AuthBrandPanel";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function SifremiUnuttumPage() {
  const user = await getCurrentUser();
  if (user) redirect("/panel");

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
          <div className="eyebrow">Hesap kurtarma</div>
          <h2>Şifremi unuttum</h2>
          <p className="lede">Hesabınıza kayıtlı e-posta adresini girin, sıfırlama bağlantısını gönderelim.</p>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
