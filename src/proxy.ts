import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/giris", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Denylist yerine allowlist: sadece admin panelinin GERÇEK route'ları
  // (src/app/(app)/ altındaki üst seviye segmentler) korunur. Herkese açık
  // pazarlama sitesi ((marketing) route group'u) sürekli yeni sayfa
  // kazanıyor — her yeni public sayfada bu listeyi güncellemeyi unutmak
  // (iletişim/gizlilik-politikası/hizmetler/surec/dijital-takip/sss'te
  // art arda yaşandı) session kontrolüne takılıp o sayfayı kilitliyordu.
  // Allowlist bu sınıf hatayı bir daha yaşanmaz hale getirir.
  matcher: [
    "/panel/:path*",
    "/musteriler/:path*",
    "/ayarlar/:path*",
    "/gelir-gider/:path*",
    "/rapor-olustur/:path*",
    "/kayitlar/:path*",
    "/revizeler/:path*",
    "/kullanicilar/:path*",
  ],
};
