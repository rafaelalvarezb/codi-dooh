/** Platform money settings: DB overrides on top of env defaults. */
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export type PlatformSettings = {
  /** Platform commission in basis points (3000 = 30%). Host keeps the rest. */
  commissionBps: number;
  /** List price per spot, per screen, per 30-day month, in centavos. */
  defaultSpotPriceCents: number;
  /** Day of the month hosts are paid. */
  payoutDay: number;
};

const KEYS = ["commissionBps", "defaultSpotPriceCents", "payoutDay"] as const;

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : fallback;
}

export function envDefaults(): PlatformSettings {
  return {
    commissionBps: intFromEnv("PLATFORM_COMMISSION_BPS", 3000, 0, 10_000),
    defaultSpotPriceCents: intFromEnv("DEFAULT_SPOT_PRICE_MXN", 1000, 0, 1_000_000) * 100,
    payoutDay: intFromEnv("PAYOUT_DAY", 5, 1, 28),
  };
}

export async function getSettings(): Promise<PlatformSettings> {
  const db = await getDb();
  const rows = await db.select().from(settings).where(inArray(settings.key, [...KEYS]));
  const out = envDefaults();
  for (const row of rows) {
    const n = Number(row.value);
    if (Number.isFinite(n) && (KEYS as readonly string[]).includes(row.key)) {
      out[row.key as keyof PlatformSettings] = n;
    }
  }
  return out;
}

export async function updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const db = await getDb();
  for (const key of KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    await db
      .insert(settings)
      .values({ key, value: String(Math.round(value)) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(Math.round(value)) } });
  }
  return getSettings();
}
