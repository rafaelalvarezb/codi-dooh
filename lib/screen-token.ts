/**
 * Kiosk secret for proof of play: HMAC(server key, screenId:version).
 * Nothing secret is stored; rotating bumps the version and kills old URLs.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { deriveKey } from "@/lib/auth/secret";

export function screenToken(screenId: string, version: number, key = deriveKey("screen-token-v1")): string {
  return createHmac("sha256", key).update(`${screenId}:${version}`).digest("base64url").slice(0, 32);
}

export function verifyScreenToken(
  screenId: string,
  version: number | null | undefined,
  token: string | null | undefined,
  key = deriveKey("screen-token-v1"),
): boolean {
  if (version === null || version === undefined || !token || token.length > 128) return false;
  const expected = Buffer.from(screenToken(screenId, version, key));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function kioskPath(screen: { id: string; profile: string }, token: string): string {
  const params = new URLSearchParams({ profile: screen.profile, screen: screen.id, token });
  if (screen.profile !== "bathroom") params.set("session", "1");
  return `/?${params.toString()}`;
}
