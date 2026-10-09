import { requireUser } from "@/lib/session";
import { sablonUret } from "@/lib/musteriExcel";

// Müşteri içe aktarma Excel şablonu — giriş yapmış kullanıcılar indirebilir.
export async function GET() {
  await requireUser();
  const dosya = await sablonUret();
  return new Response(new Uint8Array(dosya), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="musteri-ice-aktarma-sablonu.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
