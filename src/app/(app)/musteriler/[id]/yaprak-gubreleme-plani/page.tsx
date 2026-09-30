import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, yaprakGubrelemePlanlari } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { YaprakGubrelemePlaniView } from "./YaprakGubrelemePlaniView";

// Müşteri bazlı — Excel'deki gerçek yapıyla birebir: TÜM parseller aynı
// tabloda satır satır (bkz. YaprakGubrelemePlaniView). Herhangi bir parselin
// "Plan Ekle"sinden gelinirse `?parcel=` ile o satır vurgulanır.
export default async function YaprakGubrelemePlaniPage(props: PageProps<"/musteriler/[id]/yaprak-gubreleme-plani">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcelList = await parcelsRepo.list(customer.id);

  const bugunYil = new Date().getFullYear();
  const secilenYil = Number(searchParams.yil) || bugunYil;
  const vurgulananParcelId = typeof searchParams.parcel === "string" ? searchParams.parcel : null;

  const [planlar, tumYillar] = await Promise.all([
    yaprakGubrelemePlanlari.listByYil(customer.id, secilenYil),
    Promise.all(parcelList.map((p) => yaprakGubrelemePlanlari.list(customer.id, p.id))),
  ]);
  const kayitliYillar = Array.from(new Set(tumYillar.flat().map((p) => p.yil)));

  return (
    <>
      <Topbar
        title="Yaprak Gübreleme Planı"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: "Yaprak Gübreleme Planı" },
        ]}
      />
      <main className="content">
        <YaprakGubrelemePlaniView
          customer={customer}
          parcels={parcelList}
          secilenYil={secilenYil}
          planlar={planlar}
          kayitliYillar={kayitliYillar}
          vurgulananParcelId={vurgulananParcelId}
        />
      </main>
    </>
  );
}
