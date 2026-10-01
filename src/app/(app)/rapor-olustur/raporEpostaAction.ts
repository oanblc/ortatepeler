"use server";

import { requireUser } from "@/lib/session";
import { sendReportEmail } from "@/lib/email";

export interface RaporEpostaState {
  basarili: boolean;
  mesaj: string;
}

const EPOSTA_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rapor Oluştur ekranının "E-posta ile Gönder" akışı — kullanıcı önizlemeyi
// kontrol ettikten sonra tarayıcıda üretilen antetli PDF'i (bkz.
// raporAntetliPdfBlobUret) buraya FormData ile yollar, burada sadece
// sendReportEmail'e (src/lib/email.ts) iletilir. Ayrı bir PDF üretim yolu
// YOK — indirilen dosyayla gönderilen dosya birebir aynı üretimden gelir.
export async function raporEpostaylaGonderAction(
  _onceki: RaporEpostaState | null,
  formData: FormData,
): Promise<RaporEpostaState> {
  await requireUser();

  const to = String(formData.get("to") ?? "").trim();
  const raporAdi = String(formData.get("raporAdi") ?? "Rapor").trim();
  const dosyaAdi = String(formData.get("dosyaAdi") ?? "rapor.pdf").trim();
  const pdf = formData.get("pdf");

  if (!to || !EPOSTA_REGEX.test(to)) {
    return { basarili: false, mesaj: "Geçerli bir e-posta adresi girin." };
  }
  if (!(pdf instanceof File) || pdf.size === 0) {
    return { basarili: false, mesaj: "Gönderilecek rapor bulunamadı — önce bir önizleme oluşturun." };
  }

  try {
    const icerik = Buffer.from(await pdf.arrayBuffer());
    await sendReportEmail(to, raporAdi, { filename: dosyaAdi, content: icerik });
    return { basarili: true, mesaj: `Rapor ${to} adresine gönderildi.` };
  } catch (e) {
    return { basarili: false, mesaj: e instanceof Error ? e.message : "Rapor gönderilemedi." };
  }
}
