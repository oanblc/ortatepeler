import { customers, gelirGiderKayitlari } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { YeniGelirGiderForm } from "./YeniGelirGiderForm";

export default async function YeniGelirGiderPage() {
  await requireUser();

  const [tumMusteriler, mevcutKayitlar] = await Promise.all([customers.list(), gelirGiderKayitlari.list()]);
  const kategoriler = Array.from(new Set(mevcutKayitlar.map((k) => k.kategori))).sort((a, b) => a.localeCompare(b, "tr"));

  return (
    <>
      <Topbar title="Kayıt Ekle" breadcrumb={[{ label: "Gelir Gider", href: "/gelir-gider" }, { label: "Kayıt Ekle" }]} />
      <main className="content">
        <YeniGelirGiderForm musteriler={tumMusteriler} kategoriler={kategoriler} />
      </main>
    </>
  );
}
