import Link from "next/link";
import { customers, parcels, records, recordTypes, gorevler } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { haftaBaslangiciBul } from "@/lib/haftalikRapor";
import { tipBadgeSinifi } from "@/lib/kayitlar";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/IconSprite";

function formatKayitZamani(iso: string) {
  const d = new Date(iso);
  const bugun = new Date();
  const gunFarki = Math.floor((new Date(bugun.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (gunFarki === 0) return `Bugün ${saat}`;
  if (gunFarki === 1) return `Dün ${saat}`;
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${saat}`;
}

export default async function PanoPage() {
  const user = await requireUser();

  const erisilenMusteriler = (await customers.list()).filter((c) => canAccessCustomer(user, c.sorumluMuhendisId));
  const [parselListeleri, gorevListeleri, tumKayitlar, tipler] = await Promise.all([
    Promise.all(erisilenMusteriler.map((c) => parcels.list(c.id))),
    Promise.all(erisilenMusteriler.map((c) => gorevler.list(c.id))),
    records.listAll(),
    recordTypes.list(),
  ]);

  const musteriMap = new Map(erisilenMusteriler.map((c) => [c.id, c]));
  const parselMap = new Map(parselListeleri.flat().map((p) => [p.id, p]));
  const tipMap = new Map(tipler.map((t) => [t.id, t]));
  const acikGorevler = gorevListeleri.flat().filter((g) => g.durum === "bekliyor");

  const bugunIso = new Date().toISOString().slice(0, 10);
  const buHaftaBaslangic = haftaBaslangiciBul(bugunIso);

  const kayitSatirlari = tumKayitlar
    .filter((r) => musteriMap.has(r.customerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const buHaftaKayitSayisi = kayitSatirlari.filter((r) => r.tarih >= buHaftaBaslangic).length;
  const sonKayitlar = kayitSatirlari.slice(0, 6);

  const ilkAd = user.ad.split(" ")[0] ?? "Mühendis";

  return (
    <>
      <Topbar title="Pano" breadcrumb={[]} />
      <main className="content">
        <div className="pano-head">
          <h2>Merhaba, {ilkAd}</h2>
        </div>

        <div className="pano-stat-grid">
          <div className="card pano-stat musteri">
            <div className="pano-stat-icon">
              <Icon name="users" />
            </div>
            <div className="k">Toplam Müşteri</div>
            <div className="v">
              {erisilenMusteriler.length} <span className="u">müşteri</span>
            </div>
          </div>
          <div className="card pano-stat parsel">
            <div className="pano-stat-icon">
              <Icon name="map" />
            </div>
            <div className="k">Toplam Parsel</div>
            <div className="v">
              {parselMap.size} <span className="u">parsel</span>
            </div>
          </div>
          <div className="card pano-stat kayit">
            <div className="pano-stat-icon">
              <Icon name="table" />
            </div>
            <div className="k">Bu Hafta Eklenen Kayıt</div>
            <div className="v">
              {buHaftaKayitSayisi} <span className="u">kayıt</span>
            </div>
          </div>
          <div className="card pano-stat gorev">
            <div className="pano-stat-icon">
              <Icon name="check" />
            </div>
            <div className="k">Açık Görev</div>
            <div className="v">
              {acikGorevler.length} <span className="u">bekliyor</span>
            </div>
          </div>
        </div>

        <div className="pano-grid">
          <div className="card">
            <div className="panel-head">
              <h3>Son Eklenen Kayıtlar</h3>
              <Link href="/kayitlar">Tümünü gör</Link>
            </div>
            {sonKayitlar.length === 0 ? (
              <div className="empty-note">Henüz saha kaydı eklenmedi.</div>
            ) : (
              sonKayitlar.map((kayit) => {
                const musteri = musteriMap.get(kayit.customerId);
                const parsel = parselMap.get(kayit.parcelId);
                const tip = tipMap.get(kayit.recordTypeId);
                return (
                  <Link
                    key={kayit.id}
                    href={musteri && parsel ? `/musteriler/${musteri.id}/parseller/${parsel.id}` : "/kayitlar"}
                    className="kayit-row"
                  >
                    <div className={`tip-dot ${tip ? tipBadgeSinifi(tip.ad) : "tip-gozlem"}`}>
                      {tip && <Icon name={tip.ikon} />}
                    </div>
                    <div className="kayit-main">
                      <div className="kayit-title">
                        {tip?.ad ?? "Kayıt"} — {parsel?.ad ?? "Bilinmeyen parsel"}
                      </div>
                      <div className="kayit-sub">{musteri?.ad ?? "—"}</div>
                    </div>
                    <div className="kayit-zaman">{formatKayitZamani(kayit.createdAt)}</div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="card">
            <div className="panel-head">
              <h3>Bekleyen Görevler</h3>
              <Link href="/musteriler">Tümünü gör</Link>
            </div>
            {acikGorevler.length === 0 ? (
              <div className="empty-note">Bekleyen görev yok.</div>
            ) : (
              acikGorevler.slice(0, 8).map((gorev) => (
                <Link key={gorev.id} href={`/musteriler/${gorev.customerId}?tab=gorevler`} className="gorev-row">
                  <div className="gorev-durum-nokta" />
                  <div className="gorev-main">
                    <div className="gorev-konu">{gorev.konu}</div>
                    <div className="gorev-musteri">{musteriMap.get(gorev.customerId)?.ad ?? "—"}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
