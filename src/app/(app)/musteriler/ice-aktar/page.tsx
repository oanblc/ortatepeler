import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { IceAktarForm } from "./IceAktarForm";
import { MAKS_SATIR } from "@/lib/musteriExcel";

export default async function MusteriIceAktarPage() {
  await requireUser();
  return (
    <>
      <Topbar
        title="Excel ile İçe Aktar"
        breadcrumb={[{ label: "Müşteriler", href: "/musteriler" }, { label: "Excel ile İçe Aktar" }]}
      />
      <main className="content">
        <IceAktarForm maksSatir={MAKS_SATIR} />
      </main>
    </>
  );
}
