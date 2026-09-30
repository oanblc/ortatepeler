import Link from "next/link";
import { customers, parcels, records, recordTypes, users } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/IconSprite";
import { tipBadgeSinifi, kayitOzeti, formatKayitTarihi } from "@/lib/kayitlar";

// Global "Kayıtlar" sayfası — erişilebilen tüm müşterilerin tüm parsellerindeki
// saha kayıtlarını tek tabloda listeler (musteriler/page.tsx'teki
// canAccessCustomer filtreleme deseninin aynısı). Kayıt sayısı büyüdükçe
// sayfalama/arama gerekebilir, ama ilk sürümde tüm liste tek seferde gösterilir.
export default async function KayitlarPage() {
  const user = await requireUser();

  const [erisilenMusteriler, tumKayitlar, tipler, tumKullanicilar] = await Promise.all([
    customers.list().then((all) => all.filter((c) => canAccessCustomer(user, c.sorumluMuhendisId))),
    records.listAll(),
    recordTypes.list(),
    users.list(),
  ]);

  const musteriMap = new Map(erisilenMusteriler.map((c) => [c.id, c]));
  const parselListeleri = await Promise.all(erisilenMusteriler.map((c) => parcels.list(c.id)));
  const parselMap = new Map(parselListeleri.flat().map((p) => [p.id, p]));
  const tipMap = new Map(tipler.map((t) => [t.id, t]));
  const kullaniciMap = new Map(tumKullanicilar.map((u) => [u.id, u]));

  const satirlar = tumKayitlar
    .filter((r) => musteriMap.has(r.customerId))
    .map((r) => ({
      kayit: r,
      musteri: musteriMap.get(r.customerId)!,
      parsel: parselMap.get(r.parcelId),
      tip: tipMap.get(r.recordTypeId),
      muhendis: kullaniciMap.get(r.muhendisId),
    }))
    .sort((a, b) => b.kayit.tarih.localeCompare(a.kayit.tarih));

  return (
    <>
      <Topbar title="Kayıtlar" breadcrumb={[]} />
      <main className="content">
        <div className="page-head">
          <div className="eyebrow">Tüm parsellerdeki saha kayıtları · {satirlar.length} kayıt</div>
        </div>

        {satirlar.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Icon name="table" className="icon" />
              <p>Henüz saha kaydı yok. Bir parsel detayından &quot;Kayıt Ekle&quot; ile ilk kaydı oluşturabilirsiniz.</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parsel</th>
                    <th>Müşteri</th>
                    <th>Tip</th>
                    <th>Özet</th>
                    <th>Tarih</th>
                    <th>Mühendis</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map(({ kayit, musteri, parsel, tip, muhendis }) => (
                    <tr key={kayit.id}>
                      <td>
                        {parsel ? (
                          <Link href={`/musteriler/${musteri.id}/parseller/${parsel.id}`} style={{ color: "var(--ink)", fontWeight: 600 }}>
                            {parsel.ad}
                          </Link>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td>{musteri.ad}</td>
                      <td>
                        {tip ? (
                          <span className={`tip-badge ${tipBadgeSinifi(tip.ad)}`}>
                            <Icon name={tip.ikon} />
                            {tip.ad}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ color: "var(--ink-2)" }}>{kayitOzeti(tip, kayit)}</td>
                      <td className="num">{formatKayitTarihi(kayit.tarih)}</td>
                      <td>{muhendis?.ad ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              <span>{satirlar.length} kayıt</span>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
