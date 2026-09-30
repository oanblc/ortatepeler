import { notFound } from "next/navigation";
import { customers, wells } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { ParselEkleWizard } from "./ParselEkleWizard";

export default async function YeniParselPage(props: PageProps<"/musteriler/[id]/parseller/yeni">) {
  const { id } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const kuyular = await wells.list(customer.id);

  return (
    <>
      <Topbar
        title="Yeni Parsel"
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: "Yeni Parsel" },
        ]}
      />
      <main className="content">
        <ParselEkleWizard customer={customer} kuyular={kuyular} />
      </main>
    </>
  );
}
