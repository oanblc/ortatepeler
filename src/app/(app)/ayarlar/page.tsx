import Link from "next/link";
import { recordTypes, degerlendirmeSorulari, hastalikTanimlari } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import {
  createHastalikTanimiAction,
  deleteHastalikTanimiAction,
} from "@/lib/actions";

// Ayarlar sayfası — Kayıt Tipleri (herkes görür, salt okunur) + Genel
// Değerlendirme Soruları + Hastalık/Zararlı Listesi (ikisi de sadece
// yönetici). Yaprak Gübreleme Planı'nın şablonu (ürün/dönem yapısı) sabit ve
// src/lib/yaprakGubrelemePlani.ts'de kodlu — Yaprak Analizi'nin referans
// tablosunun aksine burada yönetilecek bir liste YOK. Kullanıcı yönetimi
// ayrı bir sayfada: /kullanicilar (bkz. src/app/(app)/kullanicilar/).
export default async function AyarlarPage() {
  const user = await requireUser();
  const [tipler, sorular, hastaliklar] = await Promise.all([
    recordTypes.list(),
    degerlendirmeSorulari.list(),
    hastalikTanimlari.list(),
  ]);

  return (
    <>
      <Topbar title="Ayarlar" breadcrumb={[]} />
      <main className="content">
        <div className="card ayarlar-card">
          <div className="card-head">
            <h3>Kayıt Tipleri</h3>
          </div>
          <p className="card-desc">
            Saha ziyaretlerinde girilebilen kayıt tipleri ve alanları (Kayıtlar&apos;ın kullandığı sabit tipler, salt
            okunur).
          </p>
          <div className="tip-grid">
            {tipler.map((tip) => (
              <div className="tip-card" key={tip.id}>
                <div className="tip-chip">
                  <Icon name={tip.ikon} />
                </div>
                <div>
                  <div className="tip-name">{tip.ad}</div>
                  <div className="tip-fields">{tip.fields.map((f) => f.label).join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {user.rol === "admin" && (
          <div className="card ayarlar-card">
            <div className="card-head">
              <h3>
                Genel Değerlendirme<span className="admin-tag">Yönetici</span>
              </h3>
              <Link href="/ayarlar/genel-degerlendirme" className="btn btn-primary">
                Soruları Yönet
              </Link>
            </div>
            <p className="card-desc">
              Parsellerde yılda bir doldurulan değerlendirme soruları: seçmeli, doldurmalı veya 1-5 puanlı sorular
              tanımlayın ve parsellere atayın. Şu an {sorular.length} soru tanımlı.
            </p>
          </div>
        )}

        {user.rol === "admin" && (
          <div className="card ayarlar-card">
            <div className="card-head">
              <h3>
                Hastalık / Zararlı Listesi<span className="admin-tag">Yönetici</span>
              </h3>
            </div>
            <p className="card-desc">
              Sahada karşılaşılan hastalık/zararlıları buradan tanımla — Kayıtlar&apos;daki &quot;Hastalık / Zararlı&quot;
              formunda bu listeden seçim yapılır.
            </p>

            {hastaliklar.length === 0 && <p className="card-desc">Henüz hastalık/zararlı eklenmedi.</p>}

            <div className="hastalik-chip-list">
              {hastaliklar.map((hastalik) => (
                <div className="hastalik-chip" key={hastalik.id}>
                  {hastalik.ad}
                  <ConfirmDeleteButton
                    action={deleteHastalikTanimiAction.bind(null, hastalik.id)}
                    basariliMesaj={`"${hastalik.ad}" listeden silindi.`}
                    message={
                      <>
                        &quot;<strong>{hastalik.ad}</strong>&quot; öğesini listeden silmek istediğinize emin misiniz?
                      </>
                    }
                  />
                </div>
              ))}
            </div>

            <form action={createHastalikTanimiAction} className="soru-ekle-form">
              <input name="ad" required placeholder="Örn. Dal Kanseri" />
              <button type="submit" className="btn btn-primary">
                <Icon name="plus" className="icon" />
                Ekle
              </button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
