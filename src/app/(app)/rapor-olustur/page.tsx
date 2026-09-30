import { customers, parcels as parcelsRepo } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { RaporOlusturView } from "./RaporOlusturView";

// Rapor Oluştur — üst-seviye, müşteri-route'u DIŞINDA bir sayfa (Gelir Gider
// gibi): Müşteri/Parsel burada URL segmenti değil, form alanı. Sadece
// müşteri/parsel isimlerini (form select'leri için) eager fetch eder — asıl
// rapor verisi seçim değiştikçe raporVerisiAction.ts'teki dispatcher'dan gelir.
export default async function RaporOlusturPage() {
  const user = await requireUser();
  const tumMusteriler = await customers.list();
  const erisilebilirMusteriler = tumMusteriler.filter((c) => canAccessCustomer(user, c.sorumluMuhendisId));

  const musteriler = await Promise.all(
    erisilebilirMusteriler
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
      .map(async (c) => ({
        id: c.id,
        ad: c.ad,
        parceller: (await parcelsRepo.list(c.id)).map((p) => ({ id: p.id, ad: p.ad })),
      })),
  );

  return (
    <>
      <Topbar title="Rapor Oluştur" breadcrumb={[]} />
      <main className="content">
        <RaporOlusturView
          musteriler={musteriler}
          hazirlayan={{
            ad: user.ad,
            unvan: user.rol === "admin" ? "Yönetici" : "Ziraat Mühendisi",
            iletisim: user.email,
          }}
        />
      </main>
    </>
  );
}
