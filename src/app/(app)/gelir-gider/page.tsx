import { gelirGiderKayitlari, customers } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { GelirGiderView } from "./GelirGiderView";

// Gelir Gider — genel işletme gelir/gider takibi, müşteri/parsele bağlı DEĞİL
// (kayitlar/page.tsx'teki gibi canAccessCustomer filtrelemesi burada YOK —
// finansal kayıtlar tüm mühendisler için ortak/paylaşılan veridir, bkz.
// src/lib/repositories.ts gelirGiderKayitlari). customers.list() sadece
// kayıtlardaki müşteri isimlerini göstermek için çekiliyor.
export default async function GelirGiderPage() {
  await requireUser();

  const [kayitlar, tumMusteriler] = await Promise.all([gelirGiderKayitlari.list(), customers.list()]);

  return (
    <>
      <Topbar title="Gelir Gider" breadcrumb={[]} />
      <main className="content">
        <GelirGiderView kayitlar={kayitlar} musteriler={tumMusteriler} />
      </main>
    </>
  );
}
