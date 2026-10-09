import { customers, parcels, records, recordTypes, users } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { kayitOzeti } from "@/lib/kayitlar";
import { ZIYARET_DURUM_SECENEKLERI } from "@/lib/tarim";
import { KayitlarListesi, type KayitSatiri } from "./KayitlarListesi";

// Global "Kayıtlar" sayfası — erişilebilen tüm müşterilerin tüm parsellerindeki saha kayıtları
// (musteriler/page.tsx'teki canAccessCustomer filtreleme deseninin aynısı). Filtreleme ve detay
// (fotoğraflar, hastalık, açıklama…) istemci tarafında KayitlarListesi'nde.
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
  const durumEtiketi = new Map(ZIYARET_DURUM_SECENEKLERI.map((d) => [d.value, d.label]));

  const satirlar: KayitSatiri[] = tumKayitlar
    .filter((r) => musteriMap.has(r.customerId))
    .map((r) => {
      const tip = tipMap.get(r.recordTypeId);
      return {
        id: r.id,
        musteriId: r.customerId,
        musteriAd: musteriMap.get(r.customerId)!.ad,
        parselId: r.parcelId,
        parselAd: parselMap.get(r.parcelId)?.ad ?? "—",
        tipAd: tip?.ad ?? "Kayıt",
        tipIkon: tip?.ikon ?? "table",
        ozet: kayitOzeti(tip, r),
        tarih: r.tarih,
        muhendisAd: kullaniciMap.get(r.muhendisId)?.ad ?? "—",
        fenolojikDonem: r.fenolojikDonem ?? "",
        durum: r.durum ? (durumEtiketi.get(r.durum) ?? r.durum) : "",
        oncelik: r.oncelikPuani ?? null,
        hastaliklar: r.hastaliklar ?? [],
        gorseller: r.gorseller ?? [],
        not: r.not ?? "",
        alanlar: tip
          ? tip.fields
              .map((f) => ({ label: f.label, deger: r.values[f.key] }))
              .filter((f) => f.deger !== undefined && f.deger !== null && f.deger !== "")
              .map((f) => ({ label: f.label, deger: String(f.deger) }))
          : [],
      };
    })
    .sort((a, b) => b.tarih.localeCompare(a.tarih));

  return (
    <>
      <Topbar title="Kayıtlar" breadcrumb={[]} />
      <main className="content">
        <KayitlarListesi satirlar={satirlar} />
      </main>
    </>
  );
}
