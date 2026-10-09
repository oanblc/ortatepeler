import Link from "next/link";
import { recordTypes, degerlendirmeSorulari, hastalikTanimlari } from "@/lib/repositories";
import { requireUser } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/IconSprite";

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
                Hastalık / Zararlı<span className="admin-tag">Yönetici</span>
              </h3>
              <Link href="/ayarlar/hastaliklar" className="btn btn-primary">
                Hastalıkları Yönet
              </Link>
            </div>
            <p className="card-desc">
              Sahada karşılaşılan hastalık ve zararlıların listesi. Ziyaret kaydı girerken ve Kayıtlar&apos;daki
              &quot;Hastalık / Zararlı&quot; formunda bu listeden seçim yapılır. Şu an {hastaliklar.length} kayıt tanımlı.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
