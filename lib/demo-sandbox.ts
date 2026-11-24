/**
 * "Probar como anunciante": a private, throwaway advertiser for each visitor
 * (judges, prospects). One click creates a brand with a sample video and a
 * campaign that has been running for a week on the demo screens, so results
 * and "pagos durante tu anuncio" show real-looking data right away.
 *
 * Sandboxes are flagged isDemo (hidden by "Ocultar demo"), can only book demo
 * screens, and are deleted after SANDBOX_TTL_MS.
 */
import { randomBytes } from "node:crypto";
import { and, count, eq, like, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, creatives, memberships, organizations, plays, screens, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { deleteOrg } from "@/lib/data/admin";
import { newId } from "@/lib/ids";
import { SANDBOX_PREFIX } from "@/lib/sandbox-id";
import { getSettings } from "@/lib/settings";

export { isSandboxOrgId, SANDBOX_PREFIX } from "@/lib/sandbox-id";
export const SANDBOX_TTL_MS = 48 * 3_600_000;
/** Uploads a sandbox may add on top of its sample video. */
export const SANDBOX_MAX_UPLOADS = 3;
const HISTORY_DAYS = 7;
const DAY = 86_400_000;
const MX_OFFSET_MS = -6 * 3_600_000;

/** The sample spot (also used by the Silvertag demo pilot). */
const SAMPLE = {
  blobUrl: "/ads/spot-05.mp4",
  durationMs: 6000,
  width: 1920,
  height: 1080,
  codec: "avc1.640028",
  sizeBytes: 3_335_043,
};

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function traffic(hour: number) {
  const lunch = Math.exp(-((hour - 14) ** 2) / 4);
  const evening = Math.exp(-((hour - 19) ** 2) / 3);
  return 0.25 + 0.75 * Math.max(lunch, evening * 1.1);
}

/**
 * A week of plays for a campaign on the given screens (7:00–23:00 Mexico
 * City, busier at lunch and in the evening). Pure; exported for tests.
 */
export function samplePlays(input: {
  campaignId: string;
  creativeId: string;
  screenIds: string[];
  since: number;
  now: number;
  durationMs: number;
  seed: number;
}): Array<typeof plays.$inferInsert> {
  const rows: Array<typeof plays.$inferInsert> = [];
  const rnd = prng(input.seed);
  const firstDay = Math.floor((input.since + MX_OFFSET_MS) / DAY) * DAY;
  input.screenIds.forEach((screenId, si) => {
    const screenFactor = [1, 0.8, 0.55][si] ?? 0.6;
    for (let dayStartMx = firstDay; dayStartMx - MX_OFFSET_MS < input.now; dayStartMx += DAY) {
      for (let hour = 7; hour < 23; hour++) {
        const hourStart = dayStartMx + hour * 3_600_000 - MX_OFFSET_MS;
        const n = Math.round(10 * (0.5 + 0.5 * traffic(hour)) * screenFactor + rnd() * 3);
        const slot = 3_600_000 / Math.max(1, n);
        for (let i = 0; i < n; i++) {
          let start = Math.round(hourStart + i * slot + rnd() * Math.max(0, slot - input.durationMs - 1000));
          // Odd milliseconds keep clear of other campaigns' play timestamps.
          if (start % 2 === 0) start += 1;
          if (start < input.since || start + input.durationMs > input.now) continue;
          rows.push({
            id: `ply_sbx_${input.campaignId.slice(-8)}_${si}_${start}`,
            screenId,
            creativeId: input.creativeId,
            campaignId: input.campaignId,
            startedAt: new Date(start),
            endedAt: new Date(start + input.durationMs),
            isDemo: true,
          });
        }
      }
    }
  });
  return rows;
}

/** Removes sandboxes older than the TTL (their campaigns, videos and plays go with them). */
export async function cleanupSandboxes(now = new Date()): Promise<number> {
  const db = await getDb();
  const old = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(and(like(organizations.id, `${SANDBOX_PREFIX}_%`), lt(organizations.createdAt, new Date(now.getTime() - SANDBOX_TTL_MS))));
  for (const org of old) await deleteOrg(org.id, org.name);
  return old.length;
}

export async function sandboxUploadsLeft(orgId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(creatives).where(eq(creatives.orgId, orgId));
  // The sample video doesn't count.
  return Math.max(0, SANDBOX_MAX_UPLOADS + 1 - (row?.n ?? 0));
}

export type Sandbox = { orgId: string; userId: string; campaignId: string };

export async function createSandbox(now = new Date()): Promise<Sandbox> {
  await cleanupSandboxes(now).catch((err) => console.error("[sandbox] cleanup", err));
  const db = await getDb();
  const demoScreens = await db
    .select({ id: screens.id })
    .from(screens)
    .where(and(eq(screens.isDemo, true), eq(screens.acceptsAds, true)))
    .orderBy(screens.id);
  if (demoScreens.length === 0) throw new Error("NO_DEMO_SCREENS");

  const orgId = newId(SANDBOX_PREFIX);
  const userId = newId("usr");
  const creativeId = newId("crv");
  const campaignId = newId("cmp");
  const { defaultSpotPriceCents } = await getSettings();
  const startsAt = new Date(now.getTime() - HISTORY_DAYS * DAY);
  const endsAt = new Date(now.getTime() + 23 * DAY);
  const screenIds = demoScreens.map((s) => s.id);
  const playRows = samplePlays({
    campaignId,
    creativeId,
    screenIds,
    since: startsAt.getTime(),
    now: now.getTime(),
    durationMs: SAMPLE.durationMs,
    seed: Number.parseInt(randomBytes(4).toString("hex"), 16),
  });

  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({ id: orgId, name: "Marca de prueba", kind: "advertiser", isDemo: true, createdAt: now });
    // Nobody knows this password: the session is the only way in.
    await tx.insert(users).values({
      id: userId,
      email: `${orgId.replace(/_/g, "-")}@demo.cobten.com`,
      passwordHash: await hashPassword(randomBytes(24).toString("base64url")),
      name: "Invitado",
    });
    await tx.insert(memberships).values({ userId, orgId, role: "owner" });
    await tx.insert(creatives).values({
      id: creativeId,
      orgId,
      label: "Video de ejemplo",
      blobUrl: SAMPLE.blobUrl,
      posterUrl: null,
      durationMs: SAMPLE.durationMs,
      width: SAMPLE.width,
      height: SAMPLE.height,
      codec: SAMPLE.codec,
      sizeBytes: SAMPLE.sizeBytes,
      status: "active",
      isDemo: true,
    });
    await tx.insert(campaigns).values({
      id: campaignId,
      orgId,
      name: "Campaña de ejemplo",
      creativeId,
      startsAt,
      endsAt,
      billing: "paid",
      status: "active",
      spotPriceCents: defaultSpotPriceCents,
      isDemo: true,
    });
    await tx.insert(campaignScreens).values(screenIds.map((screenId) => ({ campaignId, screenId, spots: 1 })));
    for (let i = 0; i < playRows.length; i += 1000) {
      await tx.insert(plays).values(playRows.slice(i, i + 1000)).onConflictDoNothing();
    }
  });
  return { orgId, userId, campaignId };
}
