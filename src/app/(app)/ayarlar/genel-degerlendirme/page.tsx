import { notFound } from "next/navigation";
import { customers, parcels, degerlendirmeSorulari } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { createDegerlendirmeSorusuAction } from "@/lib/actions";
import { SoruFormu } from "./SoruFormu";
import { SoruKarti } from "./SoruKarti";

// Ayarlar > Genel Değerlendirme — sadece yönetici. Burada soru + cevap tipi
// (seçmeli / doldurmalı / 1-5 puan) tanımlanır ve hangi parsellere
// uygulanacağı seçilir; parsel sayfasındaki Genel Değerlendirme kartı bu
// tanıma göre oluşur.
export default async function GenelDegerlendirmeAyarPage() {
  const user = await requireUser();
  if (user.rol !== "admin") notFound();

  const [sorular, musteriler] = await Promise.all([degerlendirmeSorulari.list(), customers.list()]);
  const parselListesi = (
    await Promise.all(
      musteriler.map(async (m) =>
        (await parcels.list(m.id)).map((p) => ({ id: p.id, ad: p.ad, musteriAd: m.ad })),
      ),
    )
  ).flat();

  return (
    <>
      <Topbar
        title="Genel Değerlendirme"
        breadcrumb={[{ label: "Ayarlar", href: "/ayarlar" }, { label: "Genel Değerlendirme" }]}
      />
      <main className="content">
        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Sorular</h3>
          </div>
          <p className="card-desc">
            Parsel sayfasındaki, yılda bir doldurulan Genel Değerlendirme&apos;de sorulacak sorular. Her soru için cevap
            tipini seçin ve hangi parsellere uygulanacağını belirleyin.
          </p>
          {sorular.length === 0 && <p className="card-desc">Henüz soru eklenmedi.</p>}
          <div className="gdq-liste">
            {sorular.map((s) => (
              <SoruKarti key={s.id} soru={s} parseller={parselListesi} />
            ))}
          </div>
        </div>

        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Yeni Soru</h3>
          </div>
          <SoruFormu action={createDegerlendirmeSorusuAction} parseller={parselListesi} />
        </div>
      </main>
    </>
  );
}
