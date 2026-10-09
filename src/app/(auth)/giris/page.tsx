import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthBrandPanel } from "../AuthBrandPanel";
import { LoginForm } from "./LoginForm";

export default async function GirisPage(props: PageProps<"/giris">) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (user) redirect(searchParams.hedef === "saha" ? "/saha" : "/panel");
  const sifirlandi = searchParams.sifirlandi === "1";

  return (
    <div className="auth">
      <AuthBrandPanel
        heading="Sahadaki her gözlem, tek defterde."
        body="Gübreleme, sulama ve gözlem kayıtlarınızı parsel bazında tek yerden yönetin; müşteri raporlarını dakikalar içinde hazırlayın."
      />
      <div className="auth-form-side">
        <div className="auth-form">
          <div className="eyebrow">Panele erişim</div>
          <h2>Giriş yap</h2>
          <p className="lede">Saha yönetim panelinize hesap bilgilerinizle devam edin.</p>
          {sifirlandi && <div className="a-success-banner">Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</div>}
          <LoginForm />
          <p className="fineprint">
            Hesabınız yok mu? <Link href="/kayit-ol">Kayıt olun</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
