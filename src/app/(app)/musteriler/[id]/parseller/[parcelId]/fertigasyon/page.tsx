import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, fertigasyonKayitlari } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { fertigasyonHesapla } from "@/lib/fertigasyon";
import { Topbar } from "@/components/Topbar";
import { FertigasyonView } from "./FertigasyonView";

export default async function FertigasyonPage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]/fertigasyon">) {
  const { id, parcelId } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const kayitlar = await fertigasyonKayitlari.list(customer.id, parcel.id);
  const kayitGorunumleri = kayitlar.map((kayit) => ({
    kayit,
    sonuc: fertigasyonHesapla(kayit),
  }));

  return (
    <>
      <Topbar
        title="Fertigasyon"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: parcel.ad, href: `/musteriler/${customer.id}/parseller/${parcel.id}` },
          { label: "Fertigasyon" },
        ]}
      />
      <main className="content">
        <FertigasyonView customer={customer} parcel={parcel} kayitGorunumleri={kayitGorunumleri} />
      </main>
    </>
  );
}
