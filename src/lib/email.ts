// E-posta gönderimi Resend'in fetch tabanlı API'siyle yapılır (ek SDK
// gerekmiyor). RESEND_API_KEY tanımlı değilse — henüz Ozan bir sağlayıcı
// seçmediği için varsayılan durum budur — gönderim yapılmaz, bağlantı
// sunucu loguna yazılır.
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[e-posta devre dışı] ${to} için şifre sıfırlama bağlantısı: ${resetUrl}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Ortatepeler Zirai Danışmanlık <bildirim@ortatepeler.com>",
      to,
      subject: "Şifre sıfırlama bağlantınız",
      html: `<p>Ortatepeler Zirai Danışmanlık hesabınız için şifre sıfırlama isteği aldık.</p><p><a href="${resetUrl}">Yeni şifrenizi belirlemek için buraya tıklayın</a></p><p>Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
    }),
  });

  if (!res.ok) {
    console.error("Şifre sıfırlama e-postası gönderilemedi:", await res.text());
  }
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
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_FORM_TO ?? "bilgi@ortatepeler.com";
  const body = `<p><b>Ad Soyad:</b> ${escapeHtml(fields.ad)}</p><p><b>Telefon:</b> ${escapeHtml(fields.telefon)}</p><p><b>E-posta:</b> ${escapeHtml(fields.eposta)}</p><p><b>Mesaj:</b><br>${escapeHtml(fields.mesaj).replace(/\n/g, "<br>")}</p>`;

  if (!apiKey) {
    console.log(`[e-posta devre dışı] Web sitesi iletişim formu:\n${JSON.stringify(fields, null, 2)}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Ortatepeler Web Sitesi <bildirim@ortatepeler.com>",
      to,
      replyTo: fields.eposta,
      subject: `Web sitesi iletişim formu — ${fields.ad}`,
      html: body,
    }),
  });

  if (!res.ok) {
    console.error("İletişim formu e-postası gönderilemedi:", await res.text());
  }
}
