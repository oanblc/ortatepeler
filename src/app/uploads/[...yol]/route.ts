import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/session";
import { UPLOAD_ROOT, ESKI_UPLOAD_ROOT } from "@/lib/uploads";

// Yüklenen fotoğraflar/fişler — sadece giriş yapmış kullanıcılara sunulur (eskiden herkese açık
// statik dosyaydı). Sadece bilinen görsel türleri, sadece upload klasörü içinden.
const TURLER: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};
const GUVENLI_PARCA = /^[A-Za-z0-9._-]{1,120}$/;

export async function GET(_req: Request, ctx: { params: Promise<{ yol: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Giriş gerekli", { status: 401 });

  const { yol } = await ctx.params;
  if (!yol.length || yol.length > 4 || !yol.every((p) => GUVENLI_PARCA.test(p) && p !== "." && p !== "..")) {
    return new Response("Bulunamadı", { status: 404 });
  }
  const tur = TURLER[path.extname(yol[yol.length - 1]!).toLowerCase()];
  if (!tur) return new Response("Bulunamadı", { status: 404 });

  for (const kok of [UPLOAD_ROOT, ESKI_UPLOAD_ROOT]) {
    const dosya = path.join(kok, ...yol);
    if (!dosya.startsWith(kok + path.sep)) continue; // klasör dışına çıkış denemesi
    try {
      const veri = await readFile(dosya);
      return new Response(new Uint8Array(veri), {
        headers: {
          "Content-Type": tur,
          "X-Content-Type-Options": "nosniff",
          // Dosya adı UUID olduğundan içerik değişmez; tarayıcı önbelleğinde kalabilir ama paylaşılan önbelleklerde değil.
          "Cache-Control": "private, max-age=86400, immutable",
        },
      });
    } catch {
      // bu konumda yok — sıradakini dene
    }
  }
  return new Response("Bulunamadı", { status: 404 });
}
