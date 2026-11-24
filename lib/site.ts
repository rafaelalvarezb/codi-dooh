/**
 * Public domains. cobten.com is the marketing site (served from /sitio);
 * app.cobten.com is the product (login, dashboards, kiosks). Both are the
 * same Vercel deploy; proxy.ts routes by Host. Any other host (vercel.app,
 * previews, localhost) behaves as before and shows the landing at /sitio.
 * Imported by proxy.ts: keep it dependency-free.
 */
export const MARKETING_URL = "https://cobten.com";
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.cobten.com").replace(/\/+$/, "");

export const MARKETING_HOSTS = new Set(["cobten.com", "www.cobten.com"]);
export const APP_HOST = new URL(APP_URL).host;

/** Paths that belong to the product, never to the marketing site. */
export const APP_PATH = /^\/(entrar|registro|probar|anunciantes|host|admin|portal)(\/|$)/;

export function hostKind(hostHeader: string | null): "marketing" | "app" | "other" {
  const host = (hostHeader ?? "").toLowerCase().split(":")[0];
  if (MARKETING_HOSTS.has(host)) return "marketing";
  if (host === APP_HOST.split(":")[0]) return "app";
  return "other";
}
