import { createHmac } from "node:crypto";

const DEV_SECRET = "codidooh-dev-only-secret-do-not-use-in-production";

/**
 * Root server secret. Required in production; a fixed dev secret is used
 * locally so `npm run dev` works without configuration.
 */
export function rootSecret(): string {
  const value =
    process.env.SESSION_SECRET || process.env.PORTAL_SECRET || process.env.AUTH_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production" && !process.env.VITEST) {
    throw new Error("SESSION_SECRET is required in production (32+ random chars).");
  }
  return DEV_SECRET;
}

/** Purpose-bound key so session cookies and kiosk tokens never share a key. */
export function deriveKey(purpose: "session-v1" | "screen-token-v1"): Buffer {
  return createHmac("sha256", rootSecret()).update(purpose).digest();
}
