import { notFound } from "next/navigation";
import Link from "next/link";
import { customers, parcels, hastalikTanimlari, records, recordTypes } from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { ZiyaretFormu, type ZiyaretOzeti } from "./ZiyaretFormu";

export default async function SahaMusteriSayfasi(props: PageProps<"/saha/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parselListesi = (await parcels.list(customer.id))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr", { numeric: true }))
    .map((p) => ({
      id: p.id,
      ad: p.ad,
      alan: p.alanDonum,
      urun: p.urunler.map((u) => u.urun).join(", "),
    }));

  const hastaliklar = (await hastalikTanimlari.list()).map((h) => h.ad);

  // Mevcut ziyaretler (düzenleme + "bu gün için kayıt var" uyarısı için). Web'deki Ziyaret Kaydı formuyla
  // aynı kural: bir ziyaret = aynı parsel + aynı gün; ortak alanlar ilk kayıttan, reçete İlaçlama kaydından okunur.
  const tipler = await recordTypes.list();
  const ilacId = tipler.find((t) => t.ad === "İlaçlama")?.id;
  const gozlemId = tipler.find((t) => t.ad === "Gözlem")?.id;
  const sinir = new Date();
  sinir.setDate(sinir.getDate() - 400);
  const sinirIso = sinir.toISOString().slice(0, 10);
  const ziyaretKayitlari = (await records.listByCustomer(customer.id)).filter(
    (r) => (r.recordTypeId === ilacId || r.recordTypeId === gozlemId) && r.tarih >= sinirIso,
  );
  const gruplar = new Map<string, typeof ziyaretKayitlari>();
  for (const r of ziyaretKayitlari) {
    const anahtar = `${r.parcelId}|${r.tarih}`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), r]);
  }
  const ziyaretler: ZiyaretOzeti[] = Array.from(gruplar.values())
    .map((grup) => {
      const ana = grup[0]!;
      const ilac = grup.find((r) => r.recordTypeId === ilacId);
      return {
        parcelId: ana.parcelId,
        tarih: ana.tarih,
        aciklama: ana.not ?? "",
        recete: (ilac?.values?.recete as string) ?? "",
        fenolojik: ana.fenolojikDonem ?? "",
        durum: ana.durum ?? "",
        oncelik: ana.oncelikPuani ?? null,
        hastaliklar: ana.hastaliklar ?? [],
        gorseller: Array.from(new Set(grup.flatMap((r) => r.gorseller ?? []))),
      };
    })
    .sort((a, b) => b.tarih.localeCompare(a.tarih));

  return (
    <>
      <Link href="/saha" className="sh-geri">
        ‹ Müşteriler
      </Link>
      <h1 className="sh-baslik">{customer.ad}</h1>
      <ZiyaretFormu customerId={customer.id} parseller={parselListesi} hastalikAdlari={hastaliklar} ziyaretler={ziyaretler} />
    </>
  );
}
