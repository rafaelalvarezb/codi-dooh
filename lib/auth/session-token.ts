/**
 * Signed session token: base64url(JSON payload) + "." + HMAC-SHA256.
 * Pure functions (no Next imports) so they are unit-testable.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

const PayloadSchema = z.object({
  v: z.literal(1),
  uid: z.string().min(1),
  /** Active organization (null = platform admin with no org selected). */
  oid: z.string().min(1).nullable(),
  role: z.enum(["owner", "member"]).nullable(),
  adm: z.boolean(),
  exp: z.number().int(),
});

export type SessionPayload = z.infer<typeof PayloadSchema>;

function mac(body: string, key: Buffer): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export function signSession(
  data: Omit<SessionPayload, "v" | "exp">,
  key: Buffer,
  now = Date.now(),
): string {
  const payload: SessionPayload = {
    v: 1,
    ...data,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body, key)}`;
}

export function verifySession(
  token: string | undefined,
  key: Buffer,
  now = Date.now(),
): SessionPayload | null {
  if (!token || token.length > 2048) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(body, key));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) return null;
  if (parsed.data.exp * 1000 <= now) return null;
  return parsed.data;
}
