/** The emails cobten sends. Content only; delivery is lib/email.ts. */
import "server-only";
import { button, esc, layout, sendEmail, type SendResult } from "@/lib/email";
import type { LeadData } from "@/lib/leads-schema";
import { APP_URL } from "@/lib/site";

/** Who hears about new demo requests: LEADS_NOTIFY_EMAIL, else the admin login. */
export function leadsRecipient(): string | null {
  return process.env.LEADS_NOTIFY_EMAIL || process.env.PORTAL_ADMIN_EMAIL || null;
}

function formatPhone(p: string): string {
  return p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 6)} ${p.slice(6)}` : p;
}

export async function notifyNewLead(lead: Omit<LeadData, "website">): Promise<SendResult> {
  const to = leadsRecipient();
  if (!to) return { sent: false, error: "no_recipient" };
  const phone = formatPhone(lead.phone);
  const wa = `https://wa.me/52${lead.phone}`;
  const rows: [string, string][] = [
    ["Negocio", lead.business],
    ["Nombre", lead.name],
    ["Teléfono", phone],
    ...(lead.email ? ([["Correo", lead.email]] as [string, string][]) : []),
    ...(lead.city ? ([["Ciudad", lead.city]] as [string, string][]) : []),
    ...(lead.spaces ? ([["Cajones", lead.spaces.toLocaleString("es-MX")]] as [string, string][]) : []),
  ];
  const table = rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#6b6b73">${esc(k)}</td><td style="padding:6px 0;font-weight:500">${esc(v)}</td></tr>`)
    .join("");
  const message = lead.message ? `<p style="margin-top:16px;white-space:pre-line">“${esc(lead.message)}”</p>` : "";
  const html = layout(
    "Nueva solicitud de demo",
    `<table role="presentation" cellspacing="0" cellpadding="0">${table}</table>${message}
<p style="margin-top:8px"><a href="${esc(wa)}" style="color:#0f8f45;font-weight:600">Escribir por WhatsApp</a> · <a href="tel:+52${esc(lead.phone)}" style="color:#2b50ff">Llamar</a></p>
${button(`${APP_URL}/admin/contactos`, "Ver en contactos")}`,
  );
  const text = [
    "Nueva solicitud de demo en cobten.com",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    lead.message ? `Mensaje: ${lead.message}` : "",
    `WhatsApp: ${wa}`,
    `Contactos: ${APP_URL}/admin/contactos`,
  ]
    .filter(Boolean)
    .join("\n");
  return sendEmail({
    to,
    subject: `Nueva demo: ${lead.business}`,
    html,
    text,
    replyTo: lead.email,
  });
}

export async function sendPasswordResetEmail(user: { name: string; email: string }, link: string): Promise<SendResult> {
  const first = user.name.split(" ")[0] || user.name;
  const html = layout(
    "Restablece tu contraseña",
    `<p>Hola, ${esc(first)}. Recibimos una solicitud para cambiar la contraseña de tu cuenta de cobten.</p>
${button(link, "Elegir nueva contraseña")}
<p style="margin-top:20px;font-size:13px;color:#6b6b73">El enlace funciona una sola vez y vence en 1 hora. Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>`,
  );
  const text = `Hola, ${first}.\n\nPara elegir una nueva contraseña de cobten abre este enlace (vence en 1 hora y funciona una sola vez):\n${link}\n\nSi no fuiste tú, ignora este correo.`;
  return sendEmail({ to: user.email, subject: "Restablece tu contraseña de cobten", html, text });
}
