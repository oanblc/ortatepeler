import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, beslenmePlanlari, beslenmeUygulamalari } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { beslenmePlaniHesapla } from "@/lib/beslenme";
import { Topbar } from "@/components/Topbar";
import { BeslenmeView } from "./BeslenmeView";

export default async function BeslenmePage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]/beslenme">) {
  const { id, parcelId } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const planlar = await beslenmePlanlari.list(customer.id, parcel.id);
  const planGorunumleri = await Promise.all(
    planlar.map(async (plan) => ({
      plan,
      sonuc: beslenmePlaniHesapla(plan, parcel.alanDonum),
      uygulamalar: (await beslenmeUygulamalari.list(customer.id, parcel.id)).filter((u) => u.planId === plan.id),
    })),
  );

  return (
    <>
      <Topbar
        title="Beslenme"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: parcel.ad, href: `/musteriler/${customer.id}/parseller/${parcel.id}` },
          { label: "Beslenme" },
        ]}
      />
      <main className="content">
        <BeslenmeView customer={customer} parcel={parcel} planGorunumleri={planGorunumleri} />
      </main>
    </>
  );
}
