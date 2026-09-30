import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ortatepeler Zirai Danışmanlık | Adana Bahçelere Parsel Bazlı Zirai Danışmanlık",
  description:
    "Adana ve Çukurova'da narenciye ve meyve bahçeleri için saha ziyaretine dayalı, parsel bazlı sulama, gübreleme ve hastalık takibi danışmanlığı. Haftalık raporlarla sonuç takibi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
