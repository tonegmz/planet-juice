// Optional email through Resend's HTTP API (https://resend.com, free tier).
// If RESEND_API_KEY isn't set, emails are skipped and everything else still works.

export async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !to) return { skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) console.error("Email failed", res.status, await res.text());
    return { ok: res.ok };
  } catch (err) {
    // An email problem should never lose the customer's request; it's already saved.
    console.error("Email error", err);
    return { ok: false };
  }
}

export function layout(title, bodyHtml) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0B0B0E">
  <div style="background:#7B5EA7;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-weight:800;letter-spacing:.04em">PLANET JUICE</div>
  <div style="border:1px solid #E6E2EC;border-top:0;padding:20px;border-radius:0 0 10px 10px">
    <h2 style="margin:0 0 12px;font-size:20px">${title}</h2>${bodyHtml}
    <p style="margin-top:24px;color:#5D5968;font-size:12px">Planet Juice · 13615 Eureka Rd, Southgate, MI 48195 · (734) 444-2819</p>
  </div></div>`;
}
