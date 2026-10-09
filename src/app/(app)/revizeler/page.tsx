import Link from "next/link";
import { revizeler } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { RevizeDurumButonlari } from "./RevizeDurumButonlari";
import type { Revize, RevizeDurumu } from "@/types";

const DURUM_ADI: Record<RevizeDurumu, string> = { acik: "Açık", yapildi: "Yapıldı", iptal: "İptal" };
const FILTRELER: { id: "acik" | "yapildi" | "iptal" | "hepsi"; ad: string }[] = [
  { id: "acik", ad: "Açık" },
  { id: "yapildi", ad: "Yapıldı" },
  { id: "iptal", ad: "İptal" },
  { id: "hepsi", ad: "Tümü" },
];

function tarihYaz(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Sistem > Revizeler — sağ alttaki Revize panelinden gelen
// değişiklik talepleri, ait oldukları sayfaya göre gruplanır. Herkes görür;
// durum değiştirme/silme sadece yönetici.
export default async function RevizelerPage(props: PageProps<"/revizeler">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const filtre = FILTRELER.find((f) => f.id === sp.durum)?.id ?? "acik";

  const tumu = await revizeler.list();
  const sayilar = {
    acik: tumu.filter((r) => r.durum === "acik").length,
    yapildi: tumu.filter((r) => r.durum === "yapildi").length,
    iptal: tumu.filter((r) => r.durum === "iptal").length,
    hepsi: tumu.length,
  };
  const gorunen = filtre === "hepsi" ? tumu : tumu.filter((r) => r.durum === filtre);

  const gruplar = new Map<string, Revize[]>();
  for (const r of gorunen) {
    const anahtar = r.sayfaAdi;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), r]);
  }

  return (
    <>
      <Topbar title="Revizeler" breadcrumb={[{ label: "Revizeler" }]} />
      <main className="content">
        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Sayfa bazlı revize listesi</h3>
          </div>
          <p className="card-desc">
            Sağ alttaki Ozana Havale Et butonundan verilen değişiklik talepleri burada, ait oldukları sayfaya göre toplanır.
            Revize vermek için ilgili sayfadayken Ozana Havale Et butonuna basıp isteğinizi yazın.
          </p>
          <div className="rv-filtreler">
            {FILTRELER.map((f) => (
              <Link key={f.id} href={`/revizeler?durum=${f.id}`} data-aktif={filtre === f.id}>
                {f.ad} <span>{sayilar[f.id]}</span>
              </Link>
            ))}
          </div>
        </div>

        {gruplar.size === 0 && (
          <div className="card ayarlar-card">
            <p className="card-desc" style={{ margin: 0 }}>
              Bu filtrede revize yok.
            </p>
          </div>
        )}

        {Array.from(gruplar.entries()).map(([sayfaAdi, liste]) => (
          <div className="card ayarlar-card" key={sayfaAdi}>
            <div className="card-head">
              <h3>{sayfaAdi}</h3>
              <span className="gdq-chip">{liste.length} revize</span>
            </div>
            <div className="rv-liste">
              {liste.map((r) => (
                <div className="rv-madde" key={r.id}>
                  <div className="rv-metin">{r.aciklama}</div>
                  <div className="rv-meta">
                    <span className="rv-durum" data-durum={r.durum}>
                      {DURUM_ADI[r.durum]}
                    </span>
                    <span>{r.olusturanAd}</span>
                    <span>{tarihYaz(r.createdAt)}</span>
                    <Link href={r.sayfaYolu} className="rv-git">
                      Sayfaya git
                    </Link>
                  </div>
                  {user.rol === "admin" && <RevizeDurumButonlari id={r.id} durum={r.durum} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
