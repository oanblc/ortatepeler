"use server";

import { sendContactFormEmail } from "@/lib/email";

export type ContactFormState = { sent: true } | { error: string } | null;

export async function submitContactFormAction(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const ad = String(formData.get("ad") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim();
  const eposta = String(formData.get("eposta") ?? "").trim();
  const mesaj = String(formData.get("mesaj") ?? "").trim();

  if (!ad || !telefon || !mesaj) return { error: "Ad, telefon ve mesaj alanlarını doldurun." };

  await sendContactFormEmail({ ad, telefon, eposta, mesaj });

  return { sent: true };
}
