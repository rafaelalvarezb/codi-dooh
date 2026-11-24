import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { useTestDb } from "@/test/db";
import { getDb } from "@/lib/db";
import { organizations, plays } from "@/lib/db/schema";
import { seedDemo, seedDemoHistory, DEMO } from "@/lib/seed";
import { loadViewer } from "@/lib/auth/accounts";
import { campaignAnalytics } from "@/lib/data/analytics";
import { createCampaign } from "@/lib/data/campaigns";
import { listOrgs } from "@/lib/data/admin";
import { makeOrg, makeScreen } from "@/test/fixtures";
import { cleanupSandboxes, createSandbox, isSandboxOrgId, samplePlays, SANDBOX_TTL_MS, sandboxUploadsLeft } from "./demo-sandbox";

const DAY = 86_400_000;

beforeEach(async () => {
  await useTestDb();
});

async function seeded(now: Date) {
  await seedDemo(now);
  await seedDemoHistory(now);
}

describe("judge sandbox", () => {
  it("creates a signed-in brand with a week-old campaign that already has results", async () => {
    const now = new Date();
    await seeded(now);
    const sbx = await createSandbox(now);
    expect(isSandboxOrgId(sbx.orgId)).toBe(true);

    const viewer = await loadViewer({ v: 1, uid: sbx.userId, oid: sbx.orgId, role: "owner", adm: false, exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(viewer?.org?.id).toBe(sbx.orgId);
    expect(viewer?.org?.kind).toBe("advertiser");

    const ctx = { orgId: sbx.orgId, kind: "advertiser" as const, role: "owner" as const };
    const results = await campaignAnalytics(ctx, sbx.campaignId, now);
    expect(results.plays).toBeGreaterThan(500);
    expect(results.attendedPayments).toBeGreaterThan(0);
    expect(await sandboxUploadsLeft(sbx.orgId)).toBe(3);
  });

  it("only books demo screens and stays hidden with 'Ocultar demo'", async () => {
    const now = new Date();
    await seeded(now);
    const sbx = await createSandbox(now);
    const ctx = { orgId: sbx.orgId, kind: "advertiser" as const, role: "owner" as const };
    const db = await getDb();
    const [creative] = await db.query.creatives.findMany({ where: (c, { eq }) => eq(c.orgId, sbx.orgId) });
    const realHost = await makeOrg("host", "Host real");
    const realScreen = await makeScreen(realHost);
    const window = { startsAt: now, endsAt: new Date(now.getTime() + 7 * DAY), mode: "advertiser" as const };
    await expect(
      createCampaign(ctx, { name: "x", creativeId: creative.id, screens: [{ screenId: realScreen, spots: 1 }], ...window }),
    ).rejects.toThrow(/pantallas demo/);
    const ok = await createCampaign(ctx, { name: "y", creativeId: creative.id, screens: [{ screenId: DEMO.screens[0].id, spots: 1 }], ...window });
    expect(ok.isDemo).toBe(true);

    const visible = await listOrgs({ includeDemo: false });
    expect(visible.some((o) => o.id === sbx.orgId)).toBe(false);
  });

  it("re-seeding the demo keeps sandbox plays; old sandboxes are deleted", async () => {
    const now = new Date();
    await seeded(now);
    const sbx = await createSandbox(now);
    const db = await getDb();
    const before = (await db.select().from(plays).where(eq(plays.campaignId, sbx.campaignId))).length;
    await seedDemoHistory(now);
    const after = (await db.select().from(plays).where(eq(plays.campaignId, sbx.campaignId))).length;
    expect(after).toBe(before);

    expect(await cleanupSandboxes(new Date(now.getTime() + SANDBOX_TTL_MS - 60_000))).toBe(0);
    expect(await cleanupSandboxes(new Date(now.getTime() + SANDBOX_TTL_MS + 60_000))).toBe(1);
    expect(await db.select().from(organizations).where(eq(organizations.id, sbx.orgId))).toHaveLength(0);
    expect(await db.select().from(plays).where(eq(plays.campaignId, sbx.campaignId))).toHaveLength(0);
  });

  it("generates plays only inside the window and opening hours", () => {
    const now = Date.UTC(2026, 10, 23, 18, 0, 0);
    const rows = samplePlays({ campaignId: "cmp_x12345678", creativeId: "crv_x", screenIds: ["a", "b"], since: now - 2 * DAY, now, durationMs: 6000, seed: 7 });
    expect(rows.length).toBeGreaterThan(100);
    for (const r of rows) {
      const t = r.startedAt.getTime();
      expect(t).toBeGreaterThanOrEqual(now - 2 * DAY);
      expect(r.endedAt.getTime()).toBeLessThanOrEqual(now);
      const mxHour = new Date(t - 6 * 3_600_000).getUTCHours();
      expect(mxHour).toBeGreaterThanOrEqual(7);
      expect(mxHour).toBeLessThan(23);
    }
  });
});
