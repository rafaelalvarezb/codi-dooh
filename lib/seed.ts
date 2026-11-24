/**
 * Demo data for the pitch, all flagged isDemo. Idempotent (fixed ids).
 * No True Religion here: that account is created live through sign-up.
 *
 * Demo orgs have no known password unless DEMO_USER_PASSWORD is set; the
 * platform admin can "operate as" them from /admin.
 */
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  campaignScreens,
  campaigns,
  creatives,
  memberships,
  organizations,
  payments,
  plays,
  screens,
  sites,
  users,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { getSettings } from "@/lib/settings";

export const DEMO = {
  hostOrg: "org_demohost01",
  hostUser: "usr_demohost01",
  hostEmail: "host@demo.codidooh.mx",
  site: "sit_demoplaza01",
  screens: [
    { id: "scr_demo_salida_a", name: "Caseta de salida A" },
    { id: "scr_demo_salida_b", name: "Caseta de salida B" },
    { id: "scr_demo_cajero_n2", name: "Cajero automático · Nivel 2" },
  ],
  brandOrg: "org_demosilvertag",
  brandUser: "usr_demosilvertag",
  brandEmail: "silvertag@demo.codidooh.mx",
  creative: "crv_demosilvertag01",
  campaign: "cmp_demosilvertag01",
} as const;

const DAY = 86_400_000;

export async function seedDemo(now = new Date()) {
  const db = await getDb();
  const { defaultSpotPriceCents } = await getSettings();
  const password = process.env.DEMO_USER_PASSWORD || randomBytes(24).toString("base64url");
  const passwordHash = await hashPassword(password);

  await db
    .insert(organizations)
    .values([
      {
        id: DEMO.hostOrg,
        name: "Estacionamiento Plaza Centro",
        kind: "host",
        legalName: "Operadora Plaza Centro SA de CV",
        // Valid demo CLABE (BBVA, check digit OK).
        clabe: "012180001234567899",
        clabeHolder: "Operadora Plaza Centro SA de CV",
        bankCode: "012",
        isDemo: true,
      },
      { id: DEMO.brandOrg, name: "Silvertag", kind: "advertiser", isDemo: true },
    ])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      { id: DEMO.hostUser, email: DEMO.hostEmail, name: "Host demo", passwordHash },
      { id: DEMO.brandUser, email: DEMO.brandEmail, name: "Silvertag demo", passwordHash },
    ])
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values([
      { userId: DEMO.hostUser, orgId: DEMO.hostOrg, role: "owner" },
      { userId: DEMO.brandUser, orgId: DEMO.brandOrg, role: "owner" },
    ])
    .onConflictDoNothing();

  await db
    .insert(sites)
    .values({
      id: DEMO.site,
      orgId: DEMO.hostOrg,
      name: "Plaza Centro · Estacionamiento",
      address: "Av. Insurgentes Sur 1235, Benito Juárez, CDMX",
      kind: "parking",
      isDemo: true,
    })
    .onConflictDoNothing();

  await db
    .insert(screens)
    .values(
      DEMO.screens.map((s) => ({
        id: s.id,
        siteId: DEMO.site,
        orgId: DEMO.hostOrg,
        name: s.name,
        location: "Plaza Centro · Estacionamiento",
        profile: "parking" as const,
        tokenVersion: 1,
        tokenRotatedAt: now,
        acceptsAds: true,
        isDemo: true,
      })),
    )
    .onConflictDoNothing();

  // Placeholder creative from public/ads (1920×1080, 6 s, H.264) until the
  // real Silvertag spot is uploaded through the platform.
  await db
    .insert(creatives)
    .values({
      id: DEMO.creative,
      orgId: DEMO.brandOrg,
      label: "Silvertag · spot provisional",
      blobUrl: "/ads/spot-05.mp4",
      posterUrl: null,
      durationMs: 6000,
      width: 1920,
      height: 1080,
      codec: "avc1.640028",
      sizeBytes: 3_335_043,
      status: "active",
      isDemo: true,
    })
    .onConflictDoUpdate({
      // Keep the demo creative's metadata in sync with the file in public/ads.
      target: creatives.id,
      set: { width: 1920, height: 1080, codec: "avc1.640028", sizeBytes: 3_335_043, durationMs: 6000 },
    });

  await db
    .insert(campaigns)
    .values({
      id: DEMO.campaign,
      orgId: DEMO.brandOrg,
      name: "Silvertag · Piloto Plaza Centro",
      creativeId: DEMO.creative,
      startsAt: new Date(now.getTime() - 14 * DAY),
      endsAt: new Date(now.getTime() + 45 * DAY),
      billing: "pilot",
      status: "active",
      spotPriceCents: defaultSpotPriceCents,
      isDemo: true,
    })
    // Re-seeding refreshes the pilot window: it always started 14 days ago
    // (matching the regenerated history) and its end only moves forward.
    .onConflictDoUpdate({
      target: campaigns.id,
      set: { startsAt: sql`excluded.starts_at`, endsAt: sql`greatest(${campaigns.endsAt}, excluded.ends_at)` },
    });

  await db
    .insert(campaignScreens)
    .values(DEMO.screens.map((s) => ({ campaignId: DEMO.campaign, screenId: s.id, spots: 2 })))
    .onConflictDoNothing();

  const history = await seedDemoHistory(now);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(screens)
    .where(sql`${screens.isDemo} = true`);
  return { screens: count, ...history };
}

/** Deterministic PRNG so every seed run produces the same shape. */
function prng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

// Mexico City has no daylight saving time since 2022: UTC-6 all year.
const MX_OFFSET_MS = -6 * 3_600_000;
const HISTORY_DAYS = 14;
const OPEN_HOUR = 7;
const CLOSE_HOUR = 23;

/** Relative traffic at a parking exit by hour (lunch and after-work peaks). */
function traffic(hour: number) {
  const lunch = Math.exp(-((hour - 14) ** 2) / 4);
  const evening = Math.exp(-((hour - 19) ** 2) / 3);
  return 0.25 + 0.75 * Math.max(lunch, evening * 1.1);
}

/**
 * Two weeks of plays and CoDi payments on the demo screens, so dashboards
 * have something to show. Each run replaces the previous demo activity
 * (rows flagged isDemo on the demo screens) with the last 14 days, so it
 * never duplicates. Real plays and payments on those screens are untouched.
 */
export async function seedDemoHistory(now = new Date()) {
  const db = await getDb();
  const [campaign] = await db
    .select({ startsAt: campaigns.startsAt })
    .from(campaigns)
    .where(eq(campaigns.id, DEMO.campaign));
  const campaignStart = campaign?.startsAt.getTime() ?? 0;

  const playRows: Array<typeof plays.$inferInsert> = [];
  const paymentRows: Array<typeof payments.$inferInsert> = [];
  const mxNow = now.getTime() + MX_OFFSET_MS;
  const todayMx = Math.floor(mxNow / DAY) * DAY; // midnight "today" as MX wall clock

  DEMO.screens.forEach((screen, si) => {
    const screenFactor = [1, 0.8, 0.55][si] ?? 0.6;
    for (let d = HISTORY_DAYS; d >= 0; d--) {
      // Day HISTORY_DAYS is the partial first day (only after the pilot started).
      const dayStartMx = todayMx - d * DAY;
      // Seeded per screen and calendar day, so re-running reproduces the
      // same rows (deduplicated by id) and only adds the days that are new.
      const rnd = prng(1000 + si * 7919 + (dayStartMx / DAY) * 104_729);
      const weekday = new Date(dayStartMx).getUTCDay();
      const dayFactor = weekday === 0 ? 0.6 : weekday === 6 ? 0.85 : 1;
      for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
        const hourStart = dayStartMx + hour * 3_600_000 - MX_OFFSET_MS; // back to UTC
        const load = traffic(hour) * dayFactor * screenFactor;

        // Plays: the spot gets 2 of the loop's slots; spread evenly with jitter.
        const nPlays = Math.round(18 * (0.6 + 0.4 * load) + rnd() * 4);
        const slot = 3_600_000 / nPlays;
        for (let i = 0; i < nPlays; i++) {
          const start = Math.round(hourStart + i * slot + rnd() * (slot - 7000));
          if (start + 6000 > now.getTime() || start < campaignStart) continue;
          playRows.push({
            id: `ply_demo_${si}_${start}`,
            screenId: screen.id,
            creativeId: DEMO.creative,
            campaignId: DEMO.campaign,
            startedAt: new Date(start),
            endedAt: new Date(start + 6000),
            isDemo: true,
          });
        }

        // Payments: cars leaving and paying with CoDi at the exit kiosk.
        const nPay = Math.round(9 * load * (0.7 + rnd() * 0.6));
        for (let i = 0; i < nPay; i++) {
          const created = Math.round(hourStart + rnd() * (3_600_000 - 120_000));
          const paid = created + Math.round(25_000 + rnd() * 70_000);
          if (paid > now.getTime()) continue;
          paymentRows.push({
            qrId: `demo_${si}_${created}`,
            machineId: screen.id,
            status: "PAID",
            amountCents: (25 + Math.floor(rnd() * 8) * 5) * 100,
            transactionId: `demo-tx-${si}-${created}`,
            concept: "Estacionamiento Plaza Centro",
            createdAt: new Date(created),
            paidAt: new Date(paid),
            updatedAt: new Date(paid),
            isDemo: true,
          });
        }
      }
    }
  });

  const screenIds = DEMO.screens.map((s) => s.id);
  await db.transaction(async (tx) => {
    // Only the Silvertag pilot's plays: "Probar como anunciante" sandboxes keep theirs.
    await tx
      .delete(plays)
      .where(and(inArray(plays.screenId, screenIds), eq(plays.isDemo, true), eq(plays.campaignId, DEMO.campaign)));
    await tx.delete(payments).where(and(inArray(payments.machineId, screenIds), eq(payments.isDemo, true)));
    for (let i = 0; i < playRows.length; i += 1000) {
      await tx.insert(plays).values(playRows.slice(i, i + 1000)).onConflictDoNothing();
    }
    for (let i = 0; i < paymentRows.length; i += 1000) {
      await tx.insert(payments).values(paymentRows.slice(i, i + 1000)).onConflictDoNothing();
    }
  });
  return { plays: playRows.length, payments: paymentRows.length };
}
