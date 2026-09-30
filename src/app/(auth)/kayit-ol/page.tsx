import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthBrandPanel } from "../AuthBrandPanel";
import { RegisterForm } from "./RegisterForm";

export default async function KayitOlPage() {
  const user = await getCurrentUser();
  if (user) redirect("/panel");

  return (
    <div className="auth">
      <AuthBrandPanel
        heading="Ekibinize birkaç adımda katılın."
        body="Hesabınızı oluşturun, yöneticiniz size müşteri ve parsel erişimlerinizi atadığında sahaya çıkmaya hazır olun."
      />
      <div className="auth-form-side">
        <div className="auth-form">
          <div className="eyebrow">Yeni hesap</div>
          <h2>Kayıt ol</h2>
          <p className="lede">Bilgilerinizi girin, yöneticinizin size müşteri ataması yapmasıyla panele erişebilirsiniz.</p>
          <RegisterForm />
          <p className="fineprint">
            Zaten hesabınız var mı? <Link href="/giris">Giriş yapın</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
