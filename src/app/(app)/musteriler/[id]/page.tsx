import { notFound } from "next/navigation";
import {
  customers,
  parcels as parcelsRepo,
  wells as wellsRepo,
  gorevler as gorevlerRepo,
  beslenmePlanlari as beslenmePlanlariRepo,
  fertigasyonKayitlari as fertigasyonKayitlariRepo,
  sulamaPlanlari as sulamaPlanlariRepo,
  yaprakGubrelemePlanlari as yaprakGubrelemePlanlariRepo,
  records as recordsRepo,
  recordTypes as recordTypesRepo,
} from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { istasyonGunlukOzet } from "@/lib/topraq";
import { CustomerDetailTabs } from "./CustomerDetailTabs";
import type { HavaGunlukOzet } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function MusteriDetayPage(props: PageProps<"/musteriler/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const [parcelList, wellList, gorevList, recordList, recordTypeList] = await Promise.all([
    parcelsRepo.list(customer.id),
    wellsRepo.list(customer.id),
    gorevlerRepo.list(customer.id),
    recordsRepo.listByCustomer(customer.id),
    recordTypesRepo.list(),
  ]);

  // Uygulamalar sekmesindeki Beslenme kartında "N sezon planı var" özetini
  // göstermek için — parsel bazlı sayım burada, server component'te yapılır.
  const beslenmePlanSayilari: Record<string, number> = {};
  await Promise.all(
    parcelList.map(async (parcel) => {
      beslenmePlanSayilari[parcel.id] = (await beslenmePlanlariRepo.list(customer.id, parcel.id)).length;
    }),
  );

  // Uygulamalar sekmesindeki Fertigasyon kartında "N kayıt var" özetini
  // göstermek için — parsel bazlı sayım burada, server component'te yapılır.
  const fertigasyonKayitSayilari: Record<string, number> = {};
  await Promise.all(
    parcelList.map(async (parcel) => {
      fertigasyonKayitSayilari[parcel.id] = (await fertigasyonKayitlariRepo.list(customer.id, parcel.id)).length;
    }),
  );

  // Uygulamalar sekmesindeki Sulama Uyumu kartında "N plan var" özetini
  // göstermek için — parsel bazlı sayım burada, server component'te yapılır.
  const sulamaPlanSayilari: Record<string, number> = {};
  await Promise.all(
    parcelList.map(async (parcel) => {
      sulamaPlanSayilari[parcel.id] = (await sulamaPlanlariRepo.list(customer.id, parcel.id)).length;
    }),
  );
  // Uygulamalar sekmesindeki Yaprak Gübreleme Planı kartında "N yıl planı var"
  // özetini göstermek için — parsel bazlı sayım burada, server component'te yapılır.
  const yaprakGubrelemeYilSayilari: Record<string, number> = {};
  await Promise.all(
    parcelList.map(async (parcel) => {
      yaprakGubrelemeYilSayilari[parcel.id] = (await yaprakGubrelemePlanlariRepo.list(customer.id, parcel.id)).length;
    }),
  );

  // Raporlar sekmesi (Özet + Haftalık Rapor) topraq.ai eşleşmesi olan her
  // parselin 90 günlük hava verisine ihtiyaç duyar — parsel detay sayfasındaki
  // (parseller/[parcelId]/page.tsx) aynı fetch deseni, burada müşterinin TÜM
  // parselleri için paralel çekilir. Bu ekstra fetch sayfa yüklenme süresini
  // biraz artırabilir — kabul edilebilir.
  const havaVerileri: Record<string, HavaGunlukOzet[] | null> = {};
  await Promise.all(
    parcelList
      .filter((p) => p.topraqEslesme)
      .map(async (p) => {
        try {
          havaVerileri[p.id] = await istasyonGunlukOzet(p.topraqEslesme!.customerId, p.topraqEslesme!.fieldId, 90);
        } catch {
          havaVerileri[p.id] = null;
        }
      }),
  );

  const initialTab =
    searchParams.tab === "raporlar"
      ? "raporlar"
      : searchParams.tab === "parseller"
        ? "parseller"
        : searchParams.tab === "kuyular"
          ? "kuyular"
          : searchParams.tab === "uygulamalar"
            ? "uygulamalar"
            : searchParams.tab === "gorevler"
              ? "gorevler"
              : searchParams.tab === "ziyaret"
                ? "ziyaret"
                : "genel";
  let banner: string | null = null;
  if (searchParams.parselEklendi) {
    banner = "Parsel eklendi.";
    if (searchParams.topraqEslesti === "1") {
      const eklenenParcel = parcelList.find((p) => p.id === searchParams.parselEklendi);
      banner += eklenenParcel?.topraqEslesme
        ? ` Toprak verisi bağlandı: ${eklenenParcel.topraqEslesme.fieldName}.`
        : " Toprak verisi bağlandı.";
    } else if (searchParams.topraqEslesti === "0") {
      banner += " Bu parselin konumu topraq.ai'de kayıtlı bir alanla eşleşmedi.";
    }
  } else if (searchParams.parselGuncellendi) {
    banner = "Parsel güncellendi.";
  }

  return (
    <>
      <Topbar title={customer.ad} breadcrumb={[{ label: "Müşteriler", href: "/musteriler" }, { label: customer.ad }]} />
      <main className="content">
        <CustomerDetailTabs
          customer={customer}
          parcels={parcelList}
          wells={wellList}
          gorevler={gorevList}
          records={recordList}
          recordTypes={recordTypeList}
          beslenmePlanSayilari={beslenmePlanSayilari}
          fertigasyonKayitSayilari={fertigasyonKayitSayilari}
          sulamaPlanSayilari={sulamaPlanSayilari}
          yaprakGubrelemeYilSayilari={yaprakGubrelemeYilSayilari}
          havaVerileri={havaVerileri}
          createdAtLabel={formatDate(customer.createdAt)}
          initialTab={initialTab}
          banner={banner}
        />
      </main>
    </>
  );
}
