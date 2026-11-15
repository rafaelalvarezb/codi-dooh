import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "codidooh_portal";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return (
    process.env.PORTAL_SECRET ||
    process.env.AUTH_SECRET ||
    "codidooh-dev-portal-secret-change-me"
  );
}

function adminEmail(): string {
  return (process.env.PORTAL_ADMIN_EMAIL || "admin@codidooh.mx").toLowerCase();
}

function adminPassword(): string {
  return process.env.PORTAL_ADMIN_PASSWORD || "codidooh";
}

export function verifyCredentials(email: string, password: string): boolean {
  const e = email.trim().toLowerCase();
  const p = password;
  const okEmail = e === adminEmail();
  const okPass = p === adminPassword();
  return okEmail && okPass;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(email: string): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${email.toLowerCase()}|${exp}`;
  return `${Buffer.from(body).toString("base64url")}.${sign(body)}`;
}

export function readSessionToken(
  token: string | undefined,
): { email: string } | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  let body: string;
  try {
    body = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const [email, expStr] = body.split("|");
  const exp = Number(expStr);
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;
  return { email };
}

export async function getPortalSession(): Promise<{ email: string } | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE)?.value);
}

export async function setPortalSession(email: string) {
  const jar = await cookies();
  jar.set(COOKIE, createSessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearPortalSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export { COOKIE as PORTAL_COOKIE };
