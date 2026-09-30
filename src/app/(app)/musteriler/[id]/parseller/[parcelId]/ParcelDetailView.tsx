"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { Toast } from "@/components/Toast";
import { useNotifications } from "@/components/NotificationsProvider";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ParcelBoundaryPicker } from "@/components/map/ParcelBoundaryPicker";
import { updateParcelSinirAction, deleteParcelAction } from "@/lib/actions";
import { ToprakNemiChart } from "./ToprakNemiChart";
import { SicaklikChart } from "./SicaklikChart";
import { BagilNemChart } from "./BagilNemChart";
import { IsiToplamiChart } from "./IsiToplamiChart";
import { GenelDegerlendirmeKarti } from "./GenelDegerlendirmeKarti";
import { tipBadgeSinifi, kayitOzeti, formatKayitTarihi } from "@/lib/kayitlar";
import type {
  Customer,
  Parcel,
  Well,
  LatLng,
  ToprakNemGunlukOzet,
  HavaGunlukOzet,
  FieldRecord,
  RecordTypeDef,
  DegerlendirmeSorusu,
  ParselDegerlendirmesi,
} from "@/types";

function formatDonum(n: number) {
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dönüm`;
}

function formatTarih(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function ParcelDetailView({
  customer,
  parcel,
  wells,
  banner,
  nemVerisi,
  nemSonGuncelleme,
  havaVerisi,
  sahaKayitlari,
  recordTypes,
  degerlendirmeSorulari,
  mevcutDegerlendirme,
  degerlendirmeYili,
  degerlendirmeYillari,
  isAdmin,
}: {
  customer: Customer;
  parcel: Parcel;
  wells: Well[];
  banner: string | null;
  /** topraq.ai'den gerçek 14 günlük toprak nemi serisi — server'da çekilir, bkz. page.tsx */
  nemVerisi: ToprakNemGunlukOzet[] | null;
  nemSonGuncelleme: string | null;
  /** topraq.ai'den gerçek hava istasyonu günlük özeti (sıcaklık + bağıl nem) */
  havaVerisi: HavaGunlukOzet[] | null;
  /** Bu parselin Saha Kayıtları — records.list ile zaten tarihe göre azalan sıralı gelir */
  sahaKayitlari: FieldRecord[];
  recordTypes: RecordTypeDef[];
  /** Genel Değerlendirme kartı için — bkz. GenelDegerlendirmeKarti.tsx */
  degerlendirmeSorulari: DegerlendirmeSorusu[];
  mevcutDegerlendirme: ParselDegerlendirmesi | null;
  degerlendirmeYili: string;
  degerlendirmeYillari: string[];
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [sinirHata, setSinirHata] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { addNotification } = useNotifications();
  // React Strict Mode geliştirme modunda effect'leri iki kez çalıştırır — addNotification
  // gibi tekrarlanabilir olmayan bir yan etki bu ref olmadan aynı banner için iki kayıt açardı.
  const bildirilenBannerRef = useRef<string | null>(null);

  const kuyuAdi = parcel.kuyuIds?.length
    ? wells
        .filter((w) => parcel.kuyuIds?.includes(w.id))
        .map((w) => w.ad)
        .join(", ")
    : undefined;
  const agacAraligi = parcel.siraArasi != null && parcel.siraUzeri != null ? `${parcel.siraArasi}m × ${parcel.siraUzeri}m` : "—";

  const boundSinirAction = updateParcelSinirAction.bind(null, customer.id, parcel.id);
  const silAction = deleteParcelAction.bind(null, customer.id, parcel.id);

  // Banner URL'deki ?sinirGuncellendi=1'den geliyor — kalıcı kalmasın diye
  // gösterildikten kısa süre sonra parametre URL'den temizlenir.
  useEffect(() => {
    if (!banner) return;
    if (bildirilenBannerRef.current !== banner) {
      bildirilenBannerRef.current = banner;
      addNotification(banner);
    }
    const zamanlayici = setTimeout(() => router.replace(pathname, { scroll: false }), 4000);
    return () => clearTimeout(zamanlayici);
  }, [banner, pathname, router, addNotification]);

  function handleSinirDevamEt(sinir: LatLng[], alanDonum: number) {
    setSinirHata(null);
    startTransition(async () => {
      try {
        await boundSinirAction(sinir, alanDonum);
      } catch (err) {
        // Next.js server action içindeki redirect() de bir "hata" olarak fırlatılır
        // (digest: "NEXT_REDIRECT..."); bunu gerçek bir kayıt hatasıyla karıştırmayalım,
        // aksi halde başarılı bir kayıttan sonra bile "kaydedilemedi" yazısı görünür.
        const digest = (err as { digest?: string } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setSinirHata("Sınır kaydedilemedi, tekrar deneyin.");
      }
    });
  }

  return (
    <>
      {banner && <Toast message={banner} />}

      <div className="content-head">
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}/duzenle`} className="btn">
            <Icon name="edit" />
            Düzenle
          </Link>
          <ConfirmDeleteButton
            label="Sil"
            action={silAction}
            basariliMesaj="Parsel silindi."
            message={
              <>
                &quot;<strong>{parcel.ad}</strong>&quot; parseli silinsin mi? Bu işlem geri alınamaz.
              </>
            }
          />
        </div>
      </div>

      <div className="parcel-detail-grid">
        <div className="card pd-bilgiler">
          <div className="parcel-detail-card-head">
            <h3>Bilgiler</h3>
          </div>
          <div className="facts-grid">
            <div className="profile-tile">
              <div className="chip">
                <Icon name="ruler" />
              </div>
              <div className="profile-tile-body">
                <span className="profile-tile-title">Alan</span>
                <span className="profile-tile-value">{formatDonum(parcel.alanDonum)}</span>
              </div>
            </div>
            <div className="profile-tile">
              <div className="chip">
                <Icon name="tree" />
              </div>
              <div className="profile-tile-body">
                <span className="profile-tile-title">Ağaç Sayısı</span>
                <span className="profile-tile-value">
                  {parcel.agacSayisi != null ? parcel.agacSayisi.toLocaleString("tr-TR") : "—"}
                </span>
              </div>
            </div>
            <div className="profile-tile">
              <div className="chip">
                <Icon name="grid" />
              </div>
              <div className="profile-tile-body">
                <span className="profile-tile-title">Ağaç Aralığı</span>
                <span className="profile-tile-value">{agacAraligi}</span>
              </div>
            </div>
            <div className="profile-tile">
              <div className="chip">
                <Icon name="droplet" />
              </div>
              <div className="profile-tile-body">
                <span className="profile-tile-title">Sulama Şekli</span>
                <span className="profile-tile-value">{parcel.sulamaSekli || "—"}</span>
              </div>
            </div>
            <div className="profile-tile">
              <div className="chip">
                <Icon name="well" />
              </div>
              <div className="profile-tile-body">
                <span className="profile-tile-title">Sulama Kuyusu</span>
                <span className="profile-tile-value">{kuyuAdi || "—"}</span>
              </div>
            </div>
            <div className="profile-tile">
              <div className="chip">
                <Icon name="clock" />
              </div>
              <div className="profile-tile-body">
                <span className="profile-tile-title">Kayıt Tarihi</span>
                <span className="profile-tile-value">{formatTarih(parcel.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card pd-urun">
          <div className="parcel-detail-card-head">
            <h3>Ürün &amp; Çeşit</h3>
          </div>
          {parcel.urunler.length > 0 ? (
            <div className="urun-list">
              {parcel.urunler.map((u, i) => (
                <div className="urun-list-item" key={i}>
                  <div className="chip">
                    <Icon name="sprout" />
                  </div>
                  <div className="profile-tile-body">
                    <span className="profile-tile-value">{u.urun}</span>
                    <span className="profile-tile-title">{u.anac ? `Anaç: ${u.anac}` : "Anaç belirtilmedi"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="sprout" className="icon" />
              <p>Henüz ürün/çeşit girilmedi.</p>
            </div>
          )}
        </div>

        <div className="card pd-saha">
          <div className="saha-card-head">
            <h3>Saha Kayıtları</h3>
            <Link href={`/musteriler/${customer.id}/parseller/${parcel.id}/kayit/yeni`} className="btn btn-primary saha-ekle-btn">
              <Icon name="plus" />
              Kayıt Ekle
            </Link>
          </div>
          {sahaKayitlari.length === 0 ? (
            <div className="empty-state">
              <Icon name="clipboard" className="icon" />
              <p>Bu parsel için henüz saha kaydı yok. Sulama, gübreleme, gözlem gibi jurnal kayıtlarını &quot;Kayıt Ekle&quot; ile ekleyebilirsiniz.</p>
            </div>
          ) : (
            <>
              <div className="saha-list">
                {sahaKayitlari.slice(0, 3).map((kayit) => {
                  const tip = recordTypes.find((t) => t.id === kayit.recordTypeId);
                  return (
                    <div className="saha-row" key={kayit.id}>
                      {tip ? (
                        <span className={`tip-badge ${tipBadgeSinifi(tip.ad)}`}>
                          <Icon name={tip.ikon} />
                          {tip.ad}
                        </span>
                      ) : (
                        <span className="tip-badge tip-gozlem">—</span>
                      )}
                      <div className="saha-row-body">
                        <span className="saha-row-summary">{kayitOzeti(tip, kayit)}</span>
                      </div>
                      <span className="saha-row-date">{formatKayitTarihi(kayit.tarih)}</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/kayitlar" className="saha-footnote">
                Tümünü Gör ({sahaKayitlari.length})
              </Link>
            </>
          )}
        </div>

        <div className="card pd-sinir">
          <div className="parcel-detail-card-head">
            <h3>Sınır</h3>
          </div>
          {parcel.sinir && parcel.sinir.length >= 3 ? (
            <>
              <div className="map-shell parcel-detail-map">
                <ParcelBoundaryPicker initialSinir={parcel.sinir} onDevamEt={handleSinirDevamEt} bilgiBandiGoster={false} />
              </div>
              <p className="chart-footnote">
                Sol üstteki çokgen aracıyla parsel sınırını çizip son noktaya tekrar tıklayarak kapatın
                {isPending ? " — kaydediliyor…" : "."}
              </p>
              {sinirHata && <div className="field-error">{sinirHata}</div>}
            </>
          ) : (
            <div className="empty-state">
              <Icon name="map" className="icon" />
              <p>Bu parsel için henüz sınır çizilmedi.</p>
            </div>
          )}
        </div>

        <div className="card pd-degerlendirme">
          <div className="parcel-detail-card-head">
            <h3>Genel Değerlendirme</h3>
          </div>
          <GenelDegerlendirmeKarti
            customerId={customer.id}
            parcelId={parcel.id}
            sorular={degerlendirmeSorulari}
            mevcutDegerlendirme={mevcutDegerlendirme}
            yil={degerlendirmeYili}
            yillar={degerlendirmeYillari}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {parcel.topraqEslesme ? (
        <>
          {nemVerisi && nemVerisi.length > 0 ? (
            <ToprakNemiChart parcelId={parcel.id} veri={nemVerisi} sonGuncelleme={nemSonGuncelleme} />
          ) : (
            <ToprakBosDurum baslik="Toprak Nemi" />
          )}
          {havaVerisi && havaVerisi.length > 0 ? (
            <SicaklikChart parcelId={parcel.id} veri={havaVerisi} />
          ) : (
            <ToprakBosDurum baslik="Sıcaklık" />
          )}
          {havaVerisi && havaVerisi.length > 0 ? (
            <BagilNemChart parcelId={parcel.id} veri={havaVerisi} />
          ) : (
            <ToprakBosDurum baslik="Bağıl Nem" />
          )}
          {havaVerisi && havaVerisi.length > 0 ? (
            <IsiToplamiChart
              customerId={customer.id}
              parcelId={parcel.id}
              veri={havaVerisi}
              baslangicTaban={parcel.gddTabanSicaklik ?? 10}
            />
          ) : (
            <ToprakBosDurum baslik="Isı Toplamı" />
          )}
        </>
      ) : (
        <div className="card toprak-card">
          <div className="toprak-head">
            <div>
              <h3>Toprak &amp; Hava Verisi</h3>
            </div>
          </div>
          <div className="empty-state">
            <Icon name="droplet" className="icon" />
            <p>
              Bu parselin konumu topraq.ai&apos;de kayıtlı bir toprak sensörüyle eşleşmedi. Sınırı düzenleyip tekrar
              deneyebilirsiniz — parsel sınırı her kaydedildiğinde eşleştirme otomatik olarak yeniden denenir.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// Eşleşme var ama o ölçüm tipi için (nem/sıcaklık/bağıl nem) veri gelmediğinde
// (ör. alanda hava istasyonu yok) gösterilen dürüst boş durum — sahte veri
// üretmek yerine hangi verinin eksik olduğu açıkça belirtilir.
function ToprakBosDurum({ baslik }: { baslik: string }) {
  return (
    <div className="card toprak-card">
      <div className="toprak-head">
        <div>
          <h3>{baslik}</h3>
        </div>
      </div>
      <div className="empty-state">
        <Icon name="droplet" className="icon" />
        <p>Bu parselin eşleştiği alanda {baslik.toLowerCase()} ölçümü yapan bir cihaz bulunmuyor.</p>
      </div>
    </div>
  );
}
