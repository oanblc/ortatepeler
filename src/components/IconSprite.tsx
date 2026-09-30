export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="i-leaf" viewBox="0 0 24 24">
          <path d="M12 3C7 3 4 7 4 12c0 5 3 8 8 9 5-1 8-4 8-9 0-5-3-9-8-9Z" />
          <path d="M8 15c2-4 4-7 9-11" />
        </symbol>
        {/* Ürün/çeşit satırlarında i-leaf küçük boyutta çember+çapraz çizgiye benzediği için
            (yasak işareti gibi görünüyor) onun yerine kullanılan, küçük boyutta da net kalan filiz ikonu. */}
        <symbol id="i-sprout" viewBox="0 0 24 24">
          <path d="M12 21V12" />
          <path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z" />
          <path d="M12 12c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5Z" />
        </symbol>
        <symbol id="i-home" viewBox="0 0 24 24">
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9.5a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1V10" />
        </symbol>
        <symbol id="i-users" viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.8 20c0-3.6 2.9-5.6 6.2-5.6s6.2 2 6.2 5.6" />
          <path d="M16 8.3a3.2 3.2 0 1 1 3.6 5" />
          <path d="M15.5 14.6c2.6.3 4.7 2.1 4.7 5.4" />
        </symbol>
        <symbol id="i-map" viewBox="0 0 24 24">
          <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
          <path d="M9 4v13" />
          <path d="M15 7v13" />
        </symbol>
        <symbol id="i-table" viewBox="0 0 24 24">
          <rect x="3" y="4.5" width="18" height="15" rx="1.6" />
          <path d="M3 9.5h18M3 14.5h18M9 4.5v15" />
        </symbol>
        <symbol id="i-grip" viewBox="0 0 24 24">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </symbol>
        <symbol id="i-download" viewBox="0 0 24 24">
          <path d="M12 3v12" />
          <path d="M7.5 10.5 12 15l4.5-4.5" />
          <path d="M4.5 18.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
        </symbol>
        <symbol id="i-clipboard" viewBox="0 0 24 24">
          <rect x="5" y="4.5" width="14" height="17" rx="2" />
          <path d="M9 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" />
          <path d="M9 11h6M9 15h6" />
        </symbol>
        <symbol id="i-reports" viewBox="0 0 24 24">
          <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M15 3v5h5" />
          <path d="M8.5 13.5h7M8.5 17h7" />
        </symbol>
        <symbol id="i-signal" viewBox="0 0 24 24">
          <path d="M4 20V13M9.5 20V9M15 20v-7M20 20V4" />
        </symbol>
        <symbol id="i-settings" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </symbol>
        <symbol id="i-bell" viewBox="0 0 24 24">
          <path d="M6 8.5a6 6 0 0 1 12 0c0 4.6 1.8 5.8 1.8 5.8H4.2S6 13.1 6 8.5Z" />
          <path d="M10.2 19.5a2 2 0 0 0 3.6 0" />
        </symbol>
        <symbol id="i-logout" viewBox="0 0 24 24">
          <path d="M14.5 3.5h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4" />
          <path d="M9.5 16.5l-5-4.5 5-4.5" />
          <path d="M15 12H4.2" />
        </symbol>
        <symbol id="i-plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="i-edit" viewBox="0 0 24 24">
          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
          <path d="M14 6.5l3.5 3.5" />
        </symbol>
        <symbol id="i-trash" viewBox="0 0 24 24">
          <path d="M4 7h16" />
          <path d="M9 7V4.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
          <path d="M6 7l1 13a1.2 1.2 0 0 0 1.2 1.1h7.6A1.2 1.2 0 0 0 17 20L18 7" />
          <path d="M10 11v6M14 11v6" />
        </symbol>
        <symbol id="i-phone" viewBox="0 0 24 24">
          <path d="M6.5 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1 1.5 1.5 0 0 1 6.5 3.5Z" />
        </symbol>
        <symbol id="i-mail" viewBox="0 0 24 24">
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3 7.5l9 6 9-6" />
        </symbol>
        <symbol id="i-mappin" viewBox="0 0 24 24">
          <path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.4" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3.2 2" />
        </symbol>
        <symbol id="i-alert" viewBox="0 0 24 24">
          <path d="M12 3 2 20.5h20L12 3Z" />
          <path d="M12 10v4" />
          <path d="M12 16.8h.01" />
        </symbol>
        <symbol id="i-chevron-r" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" />
        </symbol>
        <symbol id="i-chevron-l" viewBox="0 0 24 24">
          <path d="M15 5l-7 7 7 7" />
        </symbol>
        <symbol id="i-chevron-up" viewBox="0 0 24 24">
          <path d="M5 15l7-7 7 7" />
        </symbol>
        <symbol id="i-chevron-down" viewBox="0 0 24 24">
          <path d="M5 9l7 7 7-7" />
        </symbol>
        <symbol id="i-sort" viewBox="0 0 24 24">
          <path d="M8 9.5l4-4 4 4" />
          <path d="M16 14.5l-4 4-4-4" />
        </symbol>
        <symbol id="i-filter" viewBox="0 0 24 24">
          <path d="M4 5.5h16M7.2 12h9.6M10.4 18.5h3.2" />
        </symbol>
        <symbol id="i-ruler" viewBox="0 0 24 24">
          <path d="M4 15.5 15.5 4l4.5 4.5L8.5 20 4 15.5Z" />
          <path d="M8 12l1.5 1.5M11 9l1.5 1.5M14 6l1.5 1.5" />
        </symbol>
        <symbol id="i-tree" viewBox="0 0 24 24">
          <path d="M12 3 6 12h3l-4 6h5v3h4v-3h5l-4-6h3L12 3Z" />
        </symbol>
        <symbol id="i-grid" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </symbol>
        <symbol id="i-droplet" viewBox="0 0 24 24">
          <path d="M12 3s7 7.5 7 12.5A7 7 0 0 1 5 15.5C5 10.5 12 3 12 3Z" />
        </symbol>
        <symbol id="i-well" viewBox="0 0 24 24">
          <circle cx="12" cy="9" r="6.5" />
          <path d="M12 15.5V21" />
          <path d="M9 21h6" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
        </symbol>
        <symbol id="i-star" viewBox="0 0 24 24">
          <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1 5.9L12 16.7 6.8 19.6l1-5.9-4.3-4.1 5.9-.7L12 3.5Z" />
        </symbol>
        <symbol id="i-flask" viewBox="0 0 24 24">
          <path d="M9 3h6" />
          <path d="M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3" />
          <path d="M7.5 15h9" />
        </symbol>
        <symbol id="i-compare" viewBox="0 0 24 24">
          <path d="M4 21V9" />
          <path d="M12 21V5" />
          <path d="M20 21v-7" />
          <path d="M3 21h18" />
        </symbol>
        {/* Hastalık/Zararlı ve İlaçlama kayıt tipleri için — stilize böcek */}
        <symbol id="i-bug" viewBox="0 0 24 24">
          <path d="M12 8.5a4 4 0 0 1 4 4v3.5a4 4 0 0 1-8 0V12.5a4 4 0 0 1 4-4Z" />
          <path d="M9 9l-2.5-2.5M15 9l2.5-2.5" />
          <path d="M12 8.5V6.5" />
          <circle cx="12" cy="5" r="1.3" />
          <path d="M8 13H4.5M8 16.5H4.5M16 13h3.5M16 16.5h3.5" />
        </symbol>
        {/* Gözlem kayıt tipi için — göz ikonu */}
        <symbol id="i-eye" viewBox="0 0 24 24">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </symbol>
        {/* Gelir Gider sayfası için — cüzdan ikonu */}
        <symbol id="i-wallet" viewBox="0 0 24 24">
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a1 1 0 0 1 1 1v2" />
          <rect x="3" y="8" width="18" height="12.5" rx="2" />
          <path d="M15.5 14a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z" />
        </symbol>
        {/* Gelir Gider tablosundaki fiş sayısı için — küçük fiş/fatura ikonu */}
        <symbol id="i-receipt" viewBox="0 0 24 24">
          <path d="M6 3h12v18l-2.5-1.5L13 21l-2-1.5L9 21l-3-1.5V3Z" />
          <path d="M9 8h6M9 12h6" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={`icon${className ? ` ${className}` : ""}`}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
