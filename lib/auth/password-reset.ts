/**
 * "Recuperar contraseña": one-time links that expire in an hour. Only the
 * SHA-256 of the token is stored, so a database leak can't reset accounts.
 * Claiming a token is a single conditional UPDATE, so it works once even
 * under concurrent requests.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { passwordResets, users } from "@/lib/db/schema";
import { envAdmin, normalizeEmail } from "./accounts";
import { hashPassword } from "./password";

export const RESET_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a reset link token for this email, or null when there is no such
 * account (callers must answer the same either way). The env-configured
 * platform admin is excluded: its password lives in PORTAL_ADMIN_PASSWORD.
 */
export async function createPasswordReset(
  rawEmail: string,
  now = new Date(),
): Promise<{ token: string; user: { id: string; name: string; email: string } } | null> {
  const email = normalizeEmail(rawEmail);
  if (email === envAdmin().email) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email));
  if (!user) return null;
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({
    tokenHash: hashResetToken(token),
    userId: user.id,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
    createdAt: now,
  });
  return { token, user };
}

export class ResetTokenError extends Error {
  constructor() {
    super("El enlace ya no es válido. Pide uno nuevo.");
  }
}

/** Sets a new password with a valid token; every older session stops working. */
export async function resetPassword(token: string, newPassword: string, now = new Date()): Promise<void> {
  const db = await getDb();
  const [claimed] = await db
    .update(passwordResets)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResets.tokenHash, hashResetToken(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, now),
      ),
    )
    .returning({ userId: passwordResets.userId });
  if (!claimed) throw new ResetTokenError();

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), passwordChangedAt: now })
    .where(eq(users.id, claimed.userId));
  // Any other pending links for this account are now useless.
  await db
    .update(passwordResets)
    .set({ usedAt: now })
    .where(and(eq(passwordResets.userId, claimed.userId), isNull(passwordResets.usedAt)));
}
