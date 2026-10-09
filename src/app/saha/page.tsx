import { customers, parcels } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { MusteriListesi } from "./MusteriListesi";

export default async function SahaAnaSayfa() {
  const user = await requireUser();
  const musteriler = (await customers.list()).filter((c) => canAccessCustomer(user, c.sorumluMuhendisId));
  const liste = await Promise.all(
    musteriler
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
      .map(async (c) => ({ id: c.id, ad: c.ad, adres: c.adres ?? "", parselSayisi: (await parcels.list(c.id)).length })),
  );
  return (
    <>
      <h1 className="sh-baslik">Ziyaret kaydı</h1>
      <p className="sh-alt">Ziyaret ettiğiniz müşteriyi seçin.</p>
      <MusteriListesi musteriler={liste} />
    </>
  );
}
