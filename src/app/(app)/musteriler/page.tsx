import Link from "next/link";
import { customers } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { removeCustomerAction } from "@/lib/actions";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { SayfaBoyuSecici } from "./SayfaBoyuSecici";
import { AramaKutusu } from "./AramaKutusu";
import { MusterilerBanner } from "./MusterilerBanner";

const SAYFA_BOYU_SECENEKLERI = [10, 25, 50];
type SiralaAlani = "ad" | "ilgiliKisi";

export default async function MusterilerPage(props: PageProps<"/musteriler">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim().toLocaleLowerCase("tr") : "";
  const sayfa = Math.max(1, Number(searchParams.sayfa) || 1);
  const sayfaBoyu = SAYFA_BOYU_SECENEKLERI.includes(Number(searchParams.boyut)) ? Number(searchParams.boyut) : 10;
  const sirala: SiralaAlani = searchParams.sirala === "ilgiliKisi" ? "ilgiliKisi" : "ad";
  const yon: "asc" | "desc" = searchParams.yon === "desc" ? "desc" : "asc";

  const all = (await customers.list()).filter((c) => canAccessCustomer(user, c.sorumluMuhendisId));

  const filtered = q
    ? all.filter(
        (c) =>
          c.ad.toLocaleLowerCase("tr").includes(q) ||
          (c.adres ?? "").toLocaleLowerCase("tr").includes(q) ||
          c.ilgiliKisiler.some((k) => (k.ad ?? "").toLocaleLowerCase("tr").includes(q)),
      )
    : all;

  const siralanmis = [...filtered].sort((a, b) => {
    const av = sirala === "ilgiliKisi" ? (a.ilgiliKisiler[0]?.ad ?? "") : a.ad;
    const bv = sirala === "ilgiliKisi" ? (b.ilgiliKisiler[0]?.ad ?? "") : b.ad;
    const cmp = av.localeCompare(bv, "tr");
    return yon === "asc" ? cmp : -cmp;
  });

  const toplamSayfa = Math.max(1, Math.ceil(siralanmis.length / sayfaBoyu));
  const guncelSayfa = Math.min(sayfa, toplamSayfa);
  const sayfaListesi = siralanmis.slice((guncelSayfa - 1) * sayfaBoyu, guncelSayfa * sayfaBoyu);

  const banner = searchParams.eklendi
    ? "Müşteri eklendi."
    : searchParams.guncellendi
      ? "Müşteri güncellendi."
      : searchParams.silindi
        ? "Müşteri silindi."
        : null;
  // Silme bildirimi ConfirmDeleteButton'da submit anında optimistic olarak
  // zaten eklendi — burada tekrar eklenirse çift kayıt oluşur.
  const bannerBildir = !searchParams.silindi;

  function baseParams() {
    const p: Record<string, string> = {};
    if (q) p.q = q;
    if (sayfaBoyu !== 10) p.boyut = String(sayfaBoyu);
    return p;
  }

  function sayfaHref(hedefSayfa: number) {
    return `/musteriler?${new URLSearchParams({ ...baseParams(), ...(sirala !== "ad" ? { sirala } : {}), ...(yon !== "asc" ? { yon } : {}), sayfa: String(hedefSayfa) })}`;
  }

  function siralaHref(alan: SiralaAlani) {
    const yeniYon = sirala === alan && yon === "asc" ? "desc" : "asc";
    return `/musteriler?${new URLSearchParams({ ...baseParams(), sirala: alan, ...(yeniYon !== "asc" ? { yon: yeniYon } : {}) })}`;
  }

  return (
    <>
      <Topbar title="Müşteriler" breadcrumb={[{ label: "Müşteriler" }]} />
      <main className="content">
        {banner && <MusterilerBanner message={banner} bildir={bannerBildir} />}

        <div className="content-head">
          <AramaKutusu baslangic={q} />
          <Link href="/musteriler/yeni" className="btn btn-primary">
            <Icon name="plus" />
            Yeni Müşteri
          </Link>
        </div>

        {sayfaListesi.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            {q ? "Bu kritere uyan müşteri yok." : "Henüz müşteri yok — Yeni Müşteri ile ilk kaydı oluşturabilirsiniz."}
          </div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <Link href={siralaHref("ad")} className="th-sort" aria-current={sirala === "ad" ? "true" : undefined}>
                        Müşteri
                        <Icon name={sirala === "ad" ? (yon === "asc" ? "chevron-up" : "chevron-down") : "sort"} />
                      </Link>
                    </th>
                    <th>İletişim</th>
                    <th>
                      <Link href={siralaHref("ilgiliKisi")} className="th-sort" aria-current={sirala === "ilgiliKisi" ? "true" : undefined}>
                        İlgili Kişi
                        <Icon name={sirala === "ilgiliKisi" ? (yon === "asc" ? "chevron-up" : "chevron-down") : "sort"} />
                      </Link>
                    </th>
                    <th style={{ textAlign: "right" }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {sayfaListesi.map((c) => {
                    const initials = c.ad
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase();
                    const silAction = removeCustomerAction.bind(null, c.id);
                    const ilkKisi = c.ilgiliKisiler[0];
                    const iletisim = ilkKisi?.telefon || ilkKisi?.email;
                    const digerKisiSayisi = c.ilgiliKisiler.length - 1;
                    return (
                      <tr key={c.id}>
                        <td>
                          <Link href={`/musteriler/${c.id}`} className="cust-cell">
                            <div className="cust-avatar">{initials}</div>
                            <div>
                              <div className="name">{c.ad}</div>
                              {c.adres && <div className="addr">{c.adres}</div>}
                            </div>
                          </Link>
                        </td>
                        <td>
                          {iletisim ? (
                            <div className="contact-line">
                              <Icon name={ilkKisi?.telefon ? "phone" : "mail"} />
                              {iletisim}
                              {digerKisiSayisi > 0 && (
                                <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 12 }}>
                                  +{digerKisiSayisi} kişi daha
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td>{ilkKisi?.ad || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td>
                          <div className="row-actions">
                            <Link href={`/musteriler/${c.id}/duzenle`} className="icon-btn" title="Düzenle">
                              <Icon name="edit" />
                            </Link>
                            <ConfirmDeleteButton
                              action={silAction}
                              basariliMesaj="Müşteri silindi."
                              message={
                                <>
                                  &quot;<strong>{c.ad}</strong>&quot; silinsin mi? Bu işlem geri alınamaz.
                                </>
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              <span>
                {(guncelSayfa - 1) * sayfaBoyu + 1}–{Math.min(guncelSayfa * sayfaBoyu, siralanmis.length)} / {siralanmis.length} müşteri
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <SayfaBoyuSecici mevcut={sayfaBoyu} />
                {toplamSayfa > 1 && (
                  <div className="pager">
                    <Link href={sayfaHref(guncelSayfa - 1)} className={guncelSayfa <= 1 ? "disabled" : ""} aria-disabled={guncelSayfa <= 1}>
                      <Icon name="chevron-l" />
                    </Link>
                    {Array.from({ length: toplamSayfa }, (_, i) => i + 1).map((p) => (
                      <Link key={p} href={sayfaHref(p)} aria-current={p === guncelSayfa ? "true" : undefined}>
                        {p}
                      </Link>
                    ))}
                    <Link href={sayfaHref(guncelSayfa + 1)} className={guncelSayfa >= toplamSayfa ? "disabled" : ""} aria-disabled={guncelSayfa >= toplamSayfa}>
                      <Icon name="chevron-r" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
