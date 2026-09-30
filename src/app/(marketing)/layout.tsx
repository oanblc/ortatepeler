import { Golos_Text, JetBrains_Mono } from "next/font/google";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import "./marketing-theme.css";

// "Google Sans" bizzat Google Fonts kataloğunda yayınlanmıyor (Google'ın kendi
// ürünlerine özel, dağıtılmayan bir font). Golos Text, Google Fonts'ta yayınlanan
// ve görsel olarak Google Sans'a en yakın açık kaynaklı alternatif.
const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoMarketing = JetBrains_Mono({
  variable: "--font-mono-marketing",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${golos.variable} ${monoMarketing.variable} tarla-marketing`}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
