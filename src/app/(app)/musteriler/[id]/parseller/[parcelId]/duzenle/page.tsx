import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, wells } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { EditParcelForm } from "./EditParcelForm";

export default async function ParselDuzenlePage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]/duzenle">) {
  const { id, parcelId } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const kuyular = await wells.list(customer.id);

  return (
    <>
      <Topbar
        title="Parseli Düzenle"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: parcel.ad, href: `/musteriler/${customer.id}?tab=parseller` },
          { label: "Düzenle" },
        ]}
      />
      <main className="content">
        <EditParcelForm customer={customer} parcel={parcel} kuyular={kuyular} />
      </main>
    </>
  );
}
