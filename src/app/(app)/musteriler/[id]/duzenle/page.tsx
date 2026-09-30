import { notFound } from "next/navigation";
import { customers } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { removeCustomerAction } from "@/lib/actions";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { EditCustomerForm } from "./EditCustomerForm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function MusteriDuzenlePage(props: PageProps<"/musteriler/[id]/duzenle">) {
  const { id } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const silAction = removeCustomerAction.bind(null, id);

  return (
    <>
      <Topbar title="Müşteriyi Düzenle" breadcrumb={[{ label: "Müşteriler", href: "/musteriler" }, { label: customer.ad }]} />
      <main className="content">
        <div className="form-layout-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <EditCustomerForm customer={customer} />

            <div className="danger-zone">
              <div>
                <div className="title">
                  <Icon name="alert" />
                  Müşteriyi Sil
                </div>
                <div className="desc">Bu müşteri kalıcı olarak silinir. Bu işlem geri alınamaz.</div>
              </div>
              <ConfirmDeleteButton
                action={silAction}
                basariliMesaj="Müşteri silindi."
                message={
                  <>
                    &quot;<strong>{customer.ad}</strong>&quot; silinsin mi? Bu işlem geri alınamaz.
                  </>
                }
              />
            </div>
          </div>

          <div className="side-card">
            <div className="card">
              <h3>Özet</h3>
              <div className="stat-list">
                <div className="stat-row">
                  <span className="k">Kayıt tarihi</span>
                  <span className="v" style={{ fontFamily: "inherit" }}>
                    {formatDate(customer.createdAt)}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
                Parsel ve rapor özetleri, o modüller eklendiğinde burada görünecek.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
