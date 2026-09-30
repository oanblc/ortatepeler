import { notFound } from "next/navigation";
import { customers, parcels as parcelsRepo, sulamaPlanlari, recordTypes, records } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { sulamaUyumuHesapla } from "@/lib/sulamaUyumu";
import { Topbar } from "@/components/Topbar";
import { SulamaUyumuView } from "./SulamaUyumuView";

export default async function SulamaUyumuPage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]/sulama-uyumu">) {
  const { id, parcelId } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const planlar = await sulamaPlanlari.list(customer.id, parcel.id);

  // "Gerçekleşen" sulama — kullanıcının bu parsele Kayıtlar'dan girdiği
  // "Sulama" tipindeki kayıtların tarihlerinden gelir, ayrı bir veri girişi
  // formu yok (salt okunur).
  const sulamaTipi = (await recordTypes.list()).find((t) => t.ad.toLowerCase() === "sulama");
  const tumKayitlar = await records.list(customer.id, parcel.id);
  const uygulananTarihler = tumKayitlar.filter((r) => r.recordTypeId === sulamaTipi?.id).map((r) => r.tarih);

  const planGorunumleri = planlar.map((plan) => ({
    plan,
    sonuc: sulamaUyumuHesapla(plan.planlananTarihler, uygulananTarihler),
  }));

  return (
    <>
      <Topbar
        title="Sulama Uyumu"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: parcel.ad, href: `/musteriler/${customer.id}/parseller/${parcel.id}` },
          { label: "Sulama Uyumu" },
        ]}
      />
      <main className="content">
        <SulamaUyumuView customer={customer} parcel={parcel} planGorunumleri={planGorunumleri} />
      </main>
    </>
  );
}
