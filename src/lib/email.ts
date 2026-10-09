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

type Attachment = { filename: string; content: Buffer };
type SendArgs = { to: string | string[]; cc?: string[]; subject: string; html: string; replyTo?: string; attachments?: Attachment[] };

async function sendEmail({ to, cc, subject, html, replyTo, attachments }: SendArgs) {
  const smtp = getSmtpTransport();
  if (smtp) {
    const from = process.env.SMTP_FROM ?? `Ortatepeler Zirai Danışmanlık <${process.env.SMTP_USER}>`;
    await smtp.sendMail({ from, to, cc, subject, html, replyTo, attachments });
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
        attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
    });
    if (!res.ok) console.error(`E-posta gönderilemedi (Resend): ${await res.text()}`);
    return;
  }

  console.log(`[e-posta devre dışı] Alıcı: ${to}${cc?.length ? ` (cc: ${cc.join(", ")})` : ""}\nKonu: ${subject}\n${html}`);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Tüm e-postaların ortak kurumsal zarfı — site ile aynı marka dili (logo beyaz
// kart üzerinde, koyu yeşil + teal + altın şerit). Masaüstü/mobil e-posta
// istemcileri için tablo tabanlı, satır içi stilli (çoğu istemci <style>
// etiketini yok sayar) sade bir yapı.
function emailLayout({
  eyebrow,
  heading,
  bodyHtml,
  cta,
}: {
  eyebrow: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
}) {
  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;"><tr><td style="border-radius:999px;background:#0b7d73;">
        <a href="${cta.href}" style="display:inline-block;padding:13px 26px;font:700 14px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(cta.label)}</a>
      </td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:0;background:#eef2e6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2e6;padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(18,32,22,0.04);">
        <tr><td style="background:#122016;padding:28px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:8px;padding:7px 12px;">
            <img src="https://ortatepeler.com/ortatepeler-logo.png" alt="Ortatepeler Zirai Danışmanlık" height="22" style="display:block;height:22px;width:auto;border:0;">
          </td></tr></table>
        </td></tr>
        <tr><td style="height:3px;background:#c99a3f;line-height:0;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 32px 32px;">
          <p style="margin:0 0 10px;font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#0b7d73;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0 0 18px;font:700 22px/1.3 Georgia,'Times New Roman',serif;color:#171e17;">${escapeHtml(heading)}</h1>
          <div style="font:400 14px/1.7 Arial,Helvetica,sans-serif;color:#525a4c;">${bodyHtml}</div>
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #e4e8db;background:#f8faf2;">
          <p style="margin:0;font:700 13px/1.4 Arial,Helvetica,sans-serif;color:#171e17;">Ortatepeler Zirai Danışmanlık Ltd. Şti.</p>
          <p style="margin:4px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#848c76;">Gürselpaşa Mah. 75672 Sk. Atagün Sitesi A Blok No:4, Seyhan / Adana · 0505 428 65 98</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({
    to,
    subject: "Şifre sıfırlama bağlantınız",
    html: emailLayout({
      eyebrow: "Hesap Güvenliği",
      heading: "Şifre sıfırlama isteği aldık",
      bodyHtml: `<p style="margin:0 0 12px;">Ortatepeler Zirai Danışmanlık hesabınız için bir şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.</p><p style="margin:0;">Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz, hesabınızda herhangi bir değişiklik yapılmayacaktır.</p>`,
      cta: { label: "Yeni Şifre Belirle", href: resetUrl },
    }),
  });
}

export async function sendContactFormEmail(fields: { ad: string; telefon: string; eposta: string; mesaj: string }) {
  const to = process.env.CONTACT_FORM_TO ?? "bilgi@ortatepeler.com";
  const cc = (process.env.CONTACT_FORM_CC ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const detayRow = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;border-top:1px solid #e4e8db;font:700 12px/1.4 Arial,Helvetica,sans-serif;color:#848c76;width:110px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;border-top:1px solid #e4e8db;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#171e17;">${escapeHtml(value)}</td></tr>`;

  const internalBody = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      ${detayRow("Ad Soyad", fields.ad)}
      ${detayRow("Telefon", fields.telefon)}
      ${detayRow("E-posta", fields.eposta || "—")}
    </table>
    <p style="margin:18px 0 0;font:700 12px/1.4 Arial,Helvetica,sans-serif;color:#848c76;text-transform:uppercase;letter-spacing:0.04em;">Mesaj</p>
    <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(fields.mesaj)}</p>`;

  await sendEmail({
    to,
    cc: cc.length ? cc : undefined,
    subject: `Web sitesi iletişim formu — ${fields.ad}`,
    html: emailLayout({
      eyebrow: "İletişim Formu",
      heading: "Web sitesinden yeni bir talep geldi",
      bodyHtml: internalBody,
      cta: fields.eposta ? { label: "Yanıtla", href: `mailto:${fields.eposta}` } : undefined,
    }),
  });

  if (fields.eposta) {
    await sendEmail({
      to: fields.eposta,
      subject: "Talebiniz bize ulaştı — Ortatepeler Zirai Danışmanlık",
      html: emailLayout({
        eyebrow: "Teşekkürler",
        heading: `Merhaba ${fields.ad.split(" ")[0]}, talebiniz bize ulaştı`,
        bodyHtml: `<p style="margin:0 0 12px;">İletişim formu üzerinden gönderdiğiniz talep ekibimize ulaştı. Bahçenizi değerlendirip en kısa sürede size dönüş yapacağız.</p><p style="margin:0;">Acil bir durum varsa doğrudan telefonla da bize ulaşabilirsiniz.</p>`,
        cta: { label: "0505 428 65 98", href: "tel:+905054286598" },
      }),
    });
  }
}

export async function sendReportEmail(to: string | string[], raporAdi: string, pdf: { filename: string; content: Buffer }) {
  await sendEmail({
    to,
    subject: `Rapor: ${raporAdi}`,
    html: emailLayout({
      eyebrow: "Rapor Oluştur",
      heading: raporAdi,
      bodyHtml: `<p style="margin:0;">İstediğiniz rapor ekte PDF olarak yer alıyor.</p>`,
    }),
    attachments: [pdf],
  });
}

// "Ozana Havale Et" ile yeni bir revize kaydedilince yöneticiye bildirim.
// Alıcı REVIZE_BILDIRIM_EPOSTA (virgülle birden fazla), boşsa varsayılan adres.
export async function sendRevizeBildirimEmail(revize: {
  sayfaAdi: string;
  sayfaYolu: string;
  aciklama: string;
  olusturanAd: string;
  createdAt: string;
  baseUrl: string;
}) {
  const to = (process.env.REVIZE_BILDIRIM_EPOSTA ?? "ozanbalcioglu@gmail.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0) return;

  const tarih = new Date(revize.createdAt).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const satir = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;border-top:1px solid #e4e8db;font:700 12px/1.4 Arial,Helvetica,sans-serif;color:#848c76;width:110px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;border-top:1px solid #e4e8db;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#171e17;">${escapeHtml(value)}</td></tr>`;

  await sendEmail({
    to,
    subject: `Yeni revize — ${revize.sayfaAdi}`,
    html: emailLayout({
      eyebrow: "Ozana Havale Et",
      heading: "Panelde yeni bir revize verildi",
      bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
        ${satir("Sayfa", revize.sayfaAdi)}
        ${satir("Kim", revize.olusturanAd)}
        ${satir("Ne zaman", tarih)}
      </table>
      <p style="margin:18px 0 0;font:700 12px/1.4 Arial,Helvetica,sans-serif;color:#848c76;text-transform:uppercase;letter-spacing:0.04em;">Revize</p>
      <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(revize.aciklama)}</p>`,
      cta: { label: "Revizeler Sayfasını Aç", href: `${revize.baseUrl}/revizeler` },
    }),
  });
}
