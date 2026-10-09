import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, fertigasyonKayitlari } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { fertigasyonHesapla } from "@/lib/fertigasyon";
import { Topbar } from "@/components/Topbar";
import { FertigasyonView } from "./FertigasyonView";
import { YilSecici } from "@/components/YilSecici";
import { varsayilanYil, yilSecenekleri } from "@/lib/yilFiltre";

export default async function FertigasyonPage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]/fertigasyon">) {
  const { id, parcelId } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const kayitlar = await fertigasyonKayitlari.list(customer.id, parcel.id);
  const kayitliYillar = Array.from(new Set(kayitlar.map((k) => Number(k.tarih.slice(0, 4))).filter((n) => Number.isFinite(n))));
  const secilenYil = varsayilanYil(kayitliYillar, searchParams.yil);
  const kayitGorunumleri = kayitlar.filter((k) => Number(k.tarih.slice(0, 4)) === secilenYil).map((kayit) => ({
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
        <YilSecici secilen={secilenYil} yiller={yilSecenekleri(kayitliYillar, secilenYil)} kayitli={kayitliYillar} />
        <FertigasyonView customer={customer} parcel={parcel} kayitGorunumleri={kayitGorunumleri} />
      </main>
    </>
  );
}
