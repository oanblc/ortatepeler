import { notFound } from "next/navigation";
import { hastalikTanimlari } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { createHastalikTanimiAction } from "@/lib/actions";
import { HastalikFormu } from "./HastalikFormu";
import { HastalikKarti } from "./HastalikKarti";

// Ayarlar > Hastalık / Zararlı — sadece yönetici. Burada tanımlanan liste, ziyaret kaydında
// (web ve saha) ve Kayıtlar'daki "Hastalık / Zararlı" formunda seçilebilir.
export default async function HastalikAyarPage() {
  const user = await requireUser();
  if (user.rol !== "admin") notFound();
  const liste = await hastalikTanimlari.list();

  return (
    <>
      <Topbar
        title="Hastalık / Zararlı"
        breadcrumb={[{ label: "Ayarlar", href: "/ayarlar" }, { label: "Hastalık / Zararlı" }]}
      />
      <main className="content">
        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Liste</h3>
            <span className="gdq-chip">{liste.length} kayıt</span>
          </div>
          <p className="card-desc">
            Bir adı değiştirirseniz geçmiş ziyaret kayıtları eski adıyla kalır, yeni kayıtlarda yeni ad kullanılır.
            Silinen bir hastalık geçmiş kayıtlarda görünmeye devam eder.
          </p>
          {liste.length === 0 && <p className="card-desc">Henüz hastalık/zararlı eklenmedi.</p>}
          <div className="gdq-liste">
            {liste.map((h) => (
              <HastalikKarti key={h.id} hastalik={h} />
            ))}
          </div>
        </div>

        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Yeni Hastalık / Zararlı</h3>
          </div>
          <HastalikFormu action={createHastalikTanimiAction} />
        </div>
      </main>
    </>
  );
}
