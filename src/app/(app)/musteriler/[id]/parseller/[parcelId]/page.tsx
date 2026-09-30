import { notFound } from "next/navigation";
import {
  customers,
  parcels as parcelsRepo,
  wells as wellsRepo,
  records as recordsRepo,
  recordTypes as recordTypesRepo,
  degerlendirmeSorulari as degerlendirmeSorulariRepo,
  parselDegerlendirmeleri as parselDegerlendirmeleriRepo,
} from "@/lib/repositories";
import { requireUser, canAccessCustomer } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { getTopraqNemProfili, nemGunlukOzet, istasyonGunlukOzet } from "@/lib/topraq";
import { ParcelDetailView } from "./ParcelDetailView";
import type { ToprakNemGunlukOzet, HavaGunlukOzet } from "@/types";

export default async function ParselDetayPage(props: PageProps<"/musteriler/[id]/parseller/[parcelId]">) {
  const { id, parcelId } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const customer = (await customers.list()).find((c) => c.id === id);
  if (!customer || !canAccessCustomer(user, customer.sorumluMuhendisId)) notFound();

  const parcel = await parcelsRepo.get(customer.id, parcelId);
  if (!parcel) notFound();

  const kuyular = await wellsRepo.list(customer.id);
  const buYil = String(new Date().getFullYear());
  const secilenYil = typeof searchParams.degerlendirmeYili === "string" ? searchParams.degerlendirmeYili : buYil;
  const [sahaKayitlari, tipler, degerlendirmeSorulari, mevcutDegerlendirme, degerlendirmeYillari] = await Promise.all([
    recordsRepo.list(customer.id, parcel.id),
    recordTypesRepo.list(),
    degerlendirmeSorulariRepo.list(),
    parselDegerlendirmeleriRepo.get(customer.id, parcel.id, secilenYil),
    parselDegerlendirmeleriRepo.yillariListele(customer.id, parcel.id),
  ]);
  // Yıl seçicide son 5 yıl (henüz değerlendirme girilmemiş geçmiş yıllar da dahil,
  // geriye dönük kayıt açılabilsin) + kayıt bulunan daha eski yıllar görünür (azalan sırada).
  const sonBesYil = Array.from({ length: 5 }, (_, i) => String(Number(buYil) - i));
  const gorunecekYillar = Array.from(new Set([...sonBesYil, ...degerlendirmeYillari])).sort((a, b) => Number(b) - Number(a));

  let banner: string | null = null;
  if (searchParams.sinirGuncellendi) {
    banner = "Parsel sınırı güncellendi.";
    if (searchParams.topraqEslesti === "1" && parcel.topraqEslesme) {
      banner += ` Toprak verisi bağlandı: ${parcel.topraqEslesme.fieldName}.`;
    } else if (searchParams.topraqEslesti === "0") {
      banner += " Bu parselin konumu topraq.ai'de kayıtlı bir alanla eşleşmedi.";
    }
  }

  // Toprak verisi topraq.ai'den CANLI çekilir — burada, server component'te
  // (şifreler client'a asla gitmez). topraq.ai o an erişilemezse (ağ/servis
  // hatası) sayfa yine de açılmalı, bu yüzden her çağrı kendi try/catch'inde.
  let nemVerisi: ToprakNemGunlukOzet[] | null = null;
  let nemSonGuncelleme: string | null = null;
  let havaVerisi: HavaGunlukOzet[] | null = null;

  if (parcel.topraqEslesme?.nemDeviceId) {
    try {
      const profil = await getTopraqNemProfili(
        parcel.topraqEslesme.customerId,
        parcel.topraqEslesme.fieldId,
        parcel.topraqEslesme.nemDeviceId,
        14,
      );
      if (profil) {
        nemVerisi = nemGunlukOzet(profil);
        const sonKova = profil.buckets[profil.buckets.length - 1];
        nemSonGuncelleme = sonKova?.t ?? null;
      }
    } catch {
      nemVerisi = null;
    }
  }

  if (parcel.topraqEslesme?.istasyonDeviceId) {
    try {
      havaVerisi = await istasyonGunlukOzet(parcel.topraqEslesme.customerId, parcel.topraqEslesme.fieldId, 90);
    } catch {
      havaVerisi = null;
    }
  }

  return (
    <>
      <Topbar
        title={parcel.ad}
        breadcrumb={[
          { label: "Müşteriler", href: "/musteriler" },
          { label: customer.ad, href: `/musteriler/${customer.id}` },
          { label: parcel.ad },
        ]}
      />
      <main className="content">
        <ParcelDetailView
          customer={customer}
          parcel={parcel}
          wells={kuyular}
          banner={banner}
          nemVerisi={nemVerisi}
          nemSonGuncelleme={nemSonGuncelleme}
          havaVerisi={havaVerisi}
          sahaKayitlari={sahaKayitlari}
          recordTypes={tipler}
          degerlendirmeSorulari={degerlendirmeSorulari}
          mevcutDegerlendirme={mevcutDegerlendirme}
          degerlendirmeYili={secilenYil}
          degerlendirmeYillari={gorunecekYillar}
          isAdmin={user.rol === "admin"}
        />
      </main>
    </>
  );
}
