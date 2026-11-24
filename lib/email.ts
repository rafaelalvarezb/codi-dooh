/**
 * Transactional email through Resend's HTTP API (no SDK).
 *
 * Without RESEND_API_KEY nothing is sent: the message goes to an in-memory
 * outbox (tests read it) and is logged in development, so every flow works
 * locally and in previews before email is configured.
 *
 * EMAIL_FROM defaults to Resend's shared sender, which can only deliver to
 * the Resend account owner's own address. Once cobten.com is verified in
 * Resend, set EMAIL_FROM="cobten <hola@cobten.com>" to email anyone.
 */
import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendResult = { sent: boolean; id?: string; error?: string };

const DEFAULT_FROM = "cobten <onboarding@resend.dev>";

/** Messages "sent" without a provider (tests and local development). */
export const outbox: EmailMessage[] = [];

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    outbox.push(message);
    if (process.env.NODE_ENV === "development") {
      console.info(`[email] (sin RESEND_API_KEY) Para: ${message.to} · ${message.subject}\n${message.text}`);
    }
    return { sent: false, error: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error("[email] Resend rejected the message", res.status, data.message);
      return { sent: false, error: data.message ?? `HTTP ${res.status}` };
    }
    return { sent: true, id: data.id };
  } catch (err) {
    console.error("[email] could not reach Resend", err);
    return { sent: false, error: "network" };
  }
}

/** Escapes text for HTML email bodies. */
export function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal, client-safe layout: one column, system font, cobten wordmark. */
export function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.5px">cobten</td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:600;letter-spacing:-0.4px">${esc(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.55;color:#3a3a40">${bodyHtml}</td></tr>
</table>
<p style="font-size:12px;color:#6b6b73;margin-top:16px">cobten · Cobro CoDi para estacionamientos</p>
</td></tr></table></body></html>`;
}

export function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin-top:20px;background:#0a0a0b;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${esc(label)}</a>`;
}
