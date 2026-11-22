/**
 * Standard Webhooks signature check (https://www.standardwebhooks.com),
 * the scheme Pey documents for webhooks.
 *
 * signed content = `${webhook-id}.${webhook-timestamp}.${raw body}`
 * signature      = base64(HMAC-SHA256(secret, signed content))
 * header         = "v1,<sig> v1,<sig2> …" (several during key rotation)
 * secret         = "whsec_<base64 key>"
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_TOLERANCE_SEC = 5 * 60;

export type WebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export function webhookHeaders(h: Headers): WebhookHeaders {
  return {
    id: h.get("webhook-id"),
    timestamp: h.get("webhook-timestamp"),
    signature: h.get("webhook-signature"),
  };
}

function secretKey(secret: string): Buffer {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(raw, "base64");
}

export function signWebhook(secret: string, id: string, timestamp: number | string, body: string): string {
  const sig = createHmac("sha256", secretKey(secret)).update(`${id}.${timestamp}.${body}`).digest("base64");
  return `v1,${sig}`;
}

export function verifyWebhook(
  secret: string,
  headers: WebhookHeaders,
  body: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSec - Number(timestamp)) > WEBHOOK_TOLERANCE_SEC) return false;
  const expected = Buffer.from(signWebhook(secret, id, timestamp, body).slice(3), "base64");
  for (const part of signature.split(" ")) {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) continue;
    const given = Buffer.from(value, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}
