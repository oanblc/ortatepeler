import nodemailer from "nodemailer";

// E-posta gönderimi iki yoldan biriyle yapılır:
// 1) SMTP_HOST/SMTP_USER/SMTP_PASS tanımlıysa Hostinger (ya da başka bir SMTP
//    sağlayıcısı) üzerinden nodemailer ile gönderilir — birincil yol.
// 2) Onlar yoksa ama RESEND_API_KEY tanımlıysa Resend'in fetch tabanlı
//    API'siyle gönderilir.
// İkisi de yoksa gönderim yapılmaz, içerik sadece sunucu loguna yazılır.

let smtpTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT ?? "465");
    smtpTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return smtpTransport;
}

type SendArgs = { to: string; cc?: string[]; subject: string; html: string; replyTo?: string };

async function sendEmail({ to, cc, subject, html, replyTo }: SendArgs) {
  const smtp = getSmtpTransport();
  if (smtp) {
    const from = process.env.SMTP_FROM ?? `Ortatepeler Zirai Danışmanlık <${process.env.SMTP_USER}>`;
    await smtp.sendMail({ from, to, cc, subject, html, replyTo });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Ortatepeler Zirai Danışmanlık <bildirim@ortatepeler.com>",
        to,
        cc,
        replyTo,
        subject,
        html,
      }),
    });
    if (!res.ok) console.error(`E-posta gönderilemedi (Resend): ${await res.text()}`);
    return;
  }

  console.log(`[e-posta devre dışı] Alıcı: ${to}${cc?.length ? ` (cc: ${cc.join(", ")})` : ""}\nKonu: ${subject}\n${html}`);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({
    to,
    subject: "Şifre sıfırlama bağlantınız",
    html: `<p>Ortatepeler Zirai Danışmanlık hesabınız için şifre sıfırlama isteği aldık.</p><p><a href="${resetUrl}">Yeni şifrenizi belirlemek için buraya tıklayın</a></p><p>Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactFormEmail(fields: { ad: string; telefon: string; eposta: string; mesaj: string }) {
  const to = process.env.CONTACT_FORM_TO ?? "bilgi@ortatepeler.com";
  const cc = (process.env.CONTACT_FORM_CC ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const body = `<p><b>Ad Soyad:</b> ${escapeHtml(fields.ad)}</p><p><b>Telefon:</b> ${escapeHtml(fields.telefon)}</p><p><b>E-posta:</b> ${escapeHtml(fields.eposta)}</p><p><b>Mesaj:</b><br>${escapeHtml(fields.mesaj).replace(/\n/g, "<br>")}</p>`;

  await sendEmail({
    to,
    cc: cc.length ? cc : undefined,
    subject: `Web sitesi iletişim formu — ${fields.ad}`,
    html: body,
    replyTo: fields.eposta || undefined,
  });

  if (fields.eposta) {
    await sendEmail({
      to: fields.eposta,
      subject: "Talebiniz bize ulaştı — Ortatepeler Zirai Danışmanlık",
      html: `<p>Merhaba ${escapeHtml(fields.ad)},</p><p>İletişim formu üzerinden gönderdiğiniz talep bize ulaştı. En kısa sürede size dönüş yapacağız.</p><p>Acil bir durum varsa doğrudan <a href="tel:+905054286598">0505 428 65 98</a> numaramızdan bize ulaşabilirsiniz.</p><p>Ortatepeler Zirai Danışmanlık Ltd. Şti.</p>`,
    });
  }
}
