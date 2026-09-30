import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, recordTypes, hastalikTanimlari } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { YeniKayitForm } from "./YeniKayitForm";

export default async function YeniKayitPage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]/kayit/yeni">) {
  const { id, parcelId } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const tipler = await recordTypes.list();
  const hastaliklar = await hastalikTanimlari.list();

  return (
    <>
      <Topbar
        title="Yeni Saha Kaydı"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: parcel.ad, href: `/musteriler/${customer.id}/parseller/${parcel.id}` },
          { label: "Yeni Saha Kaydı" },
        ]}
      />
      <main className="content">
        <YeniKayitForm
          customer={customer}
          parcel={parcel}
          tipler={tipler}
          hastalikTanimlari={hastaliklar}
          baslangicTipAdi={typeof searchParams.tip === "string" ? searchParams.tip : undefined}
        />
      </main>
    </>
  );
}
