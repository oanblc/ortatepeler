import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Ortatepeler Zirai Danışmanlık",
  description: "Ortatepeler Zirai Danışmanlık web sitesi üzerinden toplanan kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
};

export default function GizlilikPolitikasiPage() {
  return (
    <section className="ot-section">
      <div className="ot-wrap ot-legal">
        <div className="ot-section-head">
          <span className="ot-eyebrow">KVKK Aydınlatma Metni</span>
          <h2>Gizlilik Politikası</h2>
          <p>Son güncelleme: Eylül 2026</p>
        </div>

        <h3>1. Veri Sorumlusu</h3>
        <p>
          Bu internet sitesi, <b>Ortatepeler Zirai Danışmanlık Limited Şirketi</b> (Gürselpaşa Mah. 75672 Sk.
          Atagün Sitesi A Blok No:4 İç Kapı No:10, Seyhan / Adana; Vergi Dairesi: Seyhan; Vergi No: 6481853662)
          tarafından, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu
          sıfatıyla işletilmektedir.
        </p>

        <h3>2. Toplanan Veriler</h3>
        <p>
          Bu site, yalnızca <b>İletişim</b> sayfasındaki formu doldurarak bize ulaşan ziyaretçilerin kendi
          isteğiyle paylaştığı verileri işler: ad soyad, telefon numarası, (verilmişse) e-posta adresi ve
          mesaj içeriği. Site üzerinde çerez tabanlı izleme, reklam ağı veya üçüncü taraf analitik aracı
          kullanılmamaktadır.
        </p>

        <h3>3. İşleme Amacı ve Hukuki Sebep</h3>
        <p>
          Paylaştığınız veriler, yalnızca talebinizi değerlendirip size dönüş yapabilmek (KVKK m.5/2-c —
          sözleşmenin kurulması için gerekli olma / m.5/2-f — meşru menfaat) amacıyla işlenir. Formu
          göndererek bu işlemeye açık rıza vermiş olursunuz.
        </p>

        <h3>4. Verilerin Aktarımı</h3>
        <p>
          Form içeriği, tarafımıza e-posta olarak iletilmesi için bir e-posta gönderim hizmeti sağlayıcısı
          (teknik altyapı sağlayıcısı) üzerinden iletilir. Bu sağlayıcı yalnızca iletim işlevi görür; veriler
          pazarlama amacıyla üçüncü kişilerle paylaşılmaz veya satılmaz.
        </p>

        <h3>5. Saklama Süresi</h3>
        <p>
          Form yoluyla iletilen talepler, ilgili talebin sonuçlandırılması ve makul bir süre boyunca (olası
          takip iletişimi için) tarafımıza ait e-posta kutusunda saklanır; ticari/yasal bir zorunluluk
          bulunmadıkça süresiz olarak tutulmaz.
        </p>

        <h3>6. İlgili Kişi Hakları</h3>
        <p>KVKK&apos;nın 11. maddesi uyarınca bize başvurarak; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme ve bu işlemlerin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme haklarına sahipsiniz.</p>

        <h3>7. Başvuru</h3>
        <p>
          Bu haklarınızı kullanmak için <a href="mailto:bilgi@ortatepeler.com">bilgi@ortatepeler.com</a>{" "}
          adresine e-posta gönderebilir ya da <a href="tel:+905054286598">0505 428 65 98</a> numaralı
          telefondan bize ulaşabilirsiniz.
        </p>
      </div>
    </section>
  );
}
