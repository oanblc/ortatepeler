import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { NewCustomerForm } from "./NewCustomerForm";

export default async function YeniMusteriPage() {
  const user = await requireUser();

  return (
    <>
      <Topbar title="Yeni Müşteri" breadcrumb={[{ label: "Müşteriler", href: "/musteriler" }, { label: "Yeni" }]} />
      <main className="content">
        <NewCustomerForm userAdi={user.ad} />
      </main>
    </>
  );
}
