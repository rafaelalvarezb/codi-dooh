/**
 * Fixed-window rate limit stored in Postgres (serverless instances don't
 * share memory, so an in-memory counter would be trivially bypassed).
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = new Date(),
): Promise<RateLimitResult> {
  const db = await getDb();
  const cutoff = new Date(now.getTime() - windowMs).toISOString();
  const nowIso = now.toISOString();
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} <= ${cutoff}::timestamptz then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} <= ${cutoff}::timestamptz then ${nowIso}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

  const count = row?.count ?? 1;
  const windowStart = row?.windowStart ?? now;
  const retryAfterSec = Math.max(
    1,
    Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000),
  );
  return { ok: count <= limit, retryAfterSec };
}

/** Client IP as seen by Vercel's edge (first x-forwarded-for hop). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
