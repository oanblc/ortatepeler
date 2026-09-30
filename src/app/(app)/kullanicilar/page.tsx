import { notFound } from "next/navigation";
import { users } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { UserRow } from "@/components/UserRow";
import { NewUserForm } from "@/components/NewUserForm";

export default async function KullanicilarPage() {
  const user = await requireUser();
  if (user.rol !== "admin") notFound();

  const tumKullanicilar = await users.list();
  const siralanmis = [...tumKullanicilar].sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  return (
    <>
      <Topbar title="Kullanıcılar" breadcrumb={[{ label: "Kullanıcılar" }]} />
      <main className="content">
        <div className="card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {siralanmis.map((u) => (
                  <UserRow key={u.id} user={u} isSelf={u.id === user.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Yeni Kullanıcı Ekle</h3>
          </div>
          <p className="card-desc">
            Yeni bir kullanıcı hesabı oluşturun. Ziraat mühendisleri sadece kendilerine atanan müşterilere erişir;
            yöneticiler tüm müşterileri ve kullanıcı yönetimini görür.
          </p>
          <NewUserForm />
        </div>
      </main>
    </>
  );
}
