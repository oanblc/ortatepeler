"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendRevizeBildirimEmail } from "./email";
import { revizeler } from "./repositories";
import { requireUser } from "./session";
import { sayfaAdiBul } from "./yardimBilgisi";
import type { RevizeDurumu } from "@/types";

function yolTemizle(yol: unknown): string {
  const s = String(yol ?? "").trim();
  return s.startsWith("/") ? s.slice(0, 200) : "/panel";
}

// Sağ alttaki "Revize" panelinden — o an açık olan sayfa için revize kaydı.
export async function revizeKaydetAction(sayfaYolu: string, aciklama: string) {
  const user = await requireUser();
  const metin = aciklama.trim().slice(0, 4000);
  if (!metin) throw new Error("Revize açıklaması boş olamaz.");
  const yol = yolTemizle(sayfaYolu);
  const kayit = await revizeler.create({
    sayfaYolu: yol,
    sayfaAdi: sayfaAdiBul(yol),
    aciklama: metin,
    olusturanId: user.id,
    olusturanAd: user.ad,
  });
  revalidatePath("/revizeler");

  // E-posta bildirimi — başarısız olsa bile revize zaten kaydedildi, kullanıcıya hata yansımaz.
  try {
    const h = await headers();
    const baseUrl = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    await sendRevizeBildirimEmail({ ...kayit, baseUrl });
  } catch (err) {
    console.error("Revize bildirim e-postası gönderilemedi:", err);
  }
}

export async function revizeDurumAction(id: string, durum: RevizeDurumu) {
  const user = await requireUser();
  if (user.rol !== "admin") throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  if (!["acik", "yapildi", "iptal"].includes(durum)) throw new Error("Geçersiz durum.");
  await revizeler.update(id, { durum });
  revalidatePath("/revizeler");
}

export async function revizeSilAction(id: string, _formData: FormData) {
  const user = await requireUser();
  if (user.rol !== "admin") throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  await revizeler.remove(id);
  revalidatePath("/revizeler");
}
