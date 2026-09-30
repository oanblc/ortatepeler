import Link from "next/link";

export function MarketingFooter() {
  return (
    <div className="ot-footer-wrap">
      <footer className="ot-footer">
        <div className="ot-footer-top">
          <div className="ot-footer-brand">
            <span className="ot-logochip">
              <img src="/ortatepeler-logo.png" alt="Ortatepeler Zirai Danışmanlık" />
            </span>
            <p>Bahçelere saha ziyaretine dayalı, parsel bazlı zirai danışmanlık hizmeti veriyoruz.</p>
          </div>
          <div className="ot-footer-cols">
            <div className="ot-footer-col">
              <h5>Hizmetler</h5>
              <ul>
                <li><Link href="/hizmetler">Sulama Danışmanlığı</Link></li>
                <li><Link href="/hizmetler">Gübreleme &amp; Beslenme</Link></li>
                <li><Link href="/hizmetler">Hastalık &amp; Zararlı Takibi</Link></li>
                <li><Link href="/hizmetler">Saha Ziyaretleri</Link></li>
              </ul>
            </div>
            <div className="ot-footer-col">
              <h5>Kurumsal</h5>
              <ul>
                <li><Link href="/surec">Nasıl Çalışırız</Link></li>
                <li><Link href="/dijital-takip">Dijital Takip Sistemi</Link></li>
                <li><Link href="/sss">SSS</Link></li>
                <li><Link href="/iletisim">İletişim</Link></li>
              </ul>
            </div>
            <div className="ot-footer-col">
              <h5>Erişim</h5>
              <ul>
                <li><Link href="/giris">Müşteri Girişi</Link></li>
                <li><Link href="/gizlilik-politikasi">Gizlilik Politikası</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="ot-footer-bottom">
          <span>© 2026 Ortatepeler Zirai Danışmanlık Ltd. Şti. · VN 6481853662</span>
          <span>Adana / Seyhan · 0505 428 65 98</span>
        </div>
      </footer>
    </div>
  );
}
