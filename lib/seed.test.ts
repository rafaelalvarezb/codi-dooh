import { beforeEach, describe, expect, it } from "vitest";
import { and, eq, ilike, sql } from "drizzle-orm";
import { useTestDb } from "@/test/db";
import { getDb } from "@/lib/db";
import { campaigns, organizations, payments, plays } from "@/lib/db/schema";
import { campaignAnalytics, platformTotals } from "@/lib/data/analytics";
import { listAllCampaigns, listAllCreatives, listOrgs, platformRevenue } from "@/lib/data/admin";
import { DEMO, seedDemo } from "./seed";

beforeEach(async () => {
  await useTestDb();
});

const count = async (table: typeof plays | typeof payments, where?: ReturnType<typeof eq>) => {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(table).where(where);
  return row.n;
};

describe("demo seed", () => {
  it("creates two weeks of demo activity, flags everything and never seeds True Religion", async () => {
    const now = new Date("2026-11-22T18:00:00Z");
    const r = await seedDemo(now);
    expect(r.screens).toBe(3);
    expect(r.plays).toBeGreaterThan(5000);
    expect(r.payments).toBeGreaterThan(1000);

    const db = await getDb();
    expect(await count(plays, eq(plays.isDemo, false))).toBe(0);
    expect(await count(payments, eq(payments.isDemo, false))).toBe(0);
    expect(await db.select().from(organizations).where(ilike(organizations.name, "%true religion%"))).toEqual([]);
    expect((await db.select().from(organizations)).every((o) => o.isDemo)).toBe(true);

    // The pilot shows results and verified attention.
    const a = await campaignAnalytics({ orgId: DEMO.brandOrg, kind: "advertiser" }, DEMO.campaign, now);
    expect(a.plays).toBe(r.plays);
    expect(a.attendedPayments).toBeGreaterThan(0);
    expect(a.byHour.slice(0, 7).every((n) => n === 0)).toBe(true); // closed at night

    // "Ocultar demo" in /admin: everything seeded disappears from totals and lists.
    const withDemo = await platformTotals(now);
    expect(withDemo.plays).toBeGreaterThan(0);
    const real = await platformTotals(now, { includeDemo: false });
    expect(real).toMatchObject({ plays: 0, payments: 0, attendedPayments: 0, hosts: 0, advertisers: 0, activeCampaigns: 0, screens: 0 });
    expect((await platformRevenue(now)).current.pilotValueCents).toBeGreaterThan(0);
    expect((await platformRevenue(now, { includeDemo: false })).current.pilotValueCents).toBe(0);
    expect(await listOrgs({ includeDemo: false })).toEqual([]);
    expect(await listAllCampaigns(now, { includeDemo: false })).toEqual([]);
    expect(await listAllCreatives({ includeDemo: false })).toEqual([]);
  });

  it("is safe to run again: replaces demo activity, keeps real data and moves the window", async () => {
    const first = new Date("2026-11-22T18:00:00Z");
    const r1 = await seedDemo(first);
    const db = await getDb();
    // A real play and payment on a demo screen (e.g. a live demo).
    await db.insert(plays).values({
      id: "ply_real_1",
      screenId: DEMO.screens[0].id,
      creativeId: DEMO.creative,
      campaignId: DEMO.campaign,
      startedAt: new Date(first.getTime() - 30_000),
      endedAt: new Date(first.getTime() - 24_000),
    });
    await db.insert(payments).values({ qrId: "qr_real_1", machineId: DEMO.screens[0].id, status: "PAID", amountCents: 1 });

    const r2 = await seedDemo(first);
    expect(r2.plays).toBe(r1.plays);
    expect(await count(plays, eq(plays.isDemo, true))).toBe(r1.plays);
    expect(await count(plays, eq(plays.isDemo, false))).toBe(1);
    expect(await count(payments, eq(payments.isDemo, false))).toBe(1);

    // A week later: still two weeks of history, and the pilot window follows.
    const later = new Date(first.getTime() + 7 * 86_400_000);
    await seedDemo(later);
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, DEMO.campaign));
    expect(c.startsAt.toISOString()).toBe(new Date(later.getTime() - 14 * 86_400_000).toISOString());
    expect(c.endsAt.getTime()).toBeGreaterThan(later.getTime());
    const [oldest] = await db
      .select({ t: sql<Date>`min(${plays.startedAt})`.mapWith((v) => new Date(v)) })
      .from(plays)
      .where(and(eq(plays.isDemo, true)));
    expect(oldest.t.getTime()).toBeGreaterThanOrEqual(c.startsAt.getTime());
  });
});
