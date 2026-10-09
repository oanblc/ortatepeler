import { notFound } from "next/navigation";
import Link from "next/link";
import { customers, parcels } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { ZiyaretFormu } from "./ZiyaretFormu";

export default async function SahaMusteriSayfasi(props: PageProps<"/saha/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parselListesi = (await parcels.list(customer.id))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr", { numeric: true }))
    .map((p) => ({
      id: p.id,
      ad: p.ad,
      alan: p.alanDonum,
      urun: p.urunler.map((u) => u.urun).join(", "),
    }));

  return (
    <>
      <Link href="/saha" className="sh-geri">
        ‹ Müşteriler
      </Link>
      <h1 className="sh-baslik">{customer.ad}</h1>
      <ZiyaretFormu customerId={customer.id} parseller={parselListesi} />
    </>
  );
}
