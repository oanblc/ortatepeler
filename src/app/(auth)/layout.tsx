import { Bricolage_Grotesque, Public_Sans, JetBrains_Mono } from "next/font/google";
import { AuthIconSprite } from "./AuthIconSprite";
import "./auth-theme.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sansAuth = Public_Sans({
  variable: "--font-sans-auth",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const monoAuth = JetBrains_Mono({
  variable: "--font-mono-auth",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${sansAuth.variable} ${monoAuth.variable} tarla-auth`}>
      <AuthIconSprite />
      {children}
    </div>
  );
}
