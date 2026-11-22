import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { useTestDb } from "@/test/db";
import { DAY, makeCreative, makeOrg, makeScreen } from "@/test/fixtures";
import { getDb } from "@/lib/db";
import { creatives, plays } from "@/lib/db/schema";
import { createCampaign, getCampaign, listCampaigns, setCampaignStatus } from "./campaigns";
import { getCreative, listCreatives } from "./creatives";
import { getPlaylist, recordPlays } from "./playlist";
import { NotFoundError, ValidationError } from "./context";
import { screenToken } from "@/lib/screen-token";

beforeEach(async () => {
  await useTestDb();
});

const now = Date.now();
const window = { startsAt: new Date(now - DAY), endsAt: new Date(now + 30 * DAY) };

describe("org isolation (authorization)", () => {
  it("an advertiser cannot read or change another org's creatives and campaigns", async () => {
    const host = await makeOrg("host");
    const screen = await makeScreen(host);
    const a = await makeOrg("advertiser", "Marca A");
    const b = await makeOrg("advertiser", "Marca B");
    const creativeA = await makeCreative(a);
    const campaignA = await createCampaign(a, {
      name: "A",
      creativeId: creativeA,
      screens: [{ screenId: screen, spots: 1 }],
      ...window,
      mode: "advertiser",
    });

    await expect(getCreative(b, creativeA)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getCampaign(b, campaignA.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setCampaignStatus(b, campaignA.id, "paused")).rejects.toBeInstanceOf(NotFoundError);
    expect(await listCampaigns(b)).toEqual([]);
    expect(await listCreatives(b)).toEqual([]);

    // B tries to publish a campaign with A's creative id.
    await expect(
      createCampaign(b, { name: "robo", creativeId: creativeA, screens: [{ screenId: screen, spots: 1 }], ...window, mode: "advertiser" }),
    ).rejects.toBeInstanceOf(NotFoundError);

    // A's campaign is untouched.
    expect((await getCampaign(a, campaignA.id)).status).toBe("active");
  });

  it("a host can only run house ads on its own screens", async () => {
    const hostA = await makeOrg("host");
    const hostB = await makeOrg("host");
    const screenB = await makeScreen(hostB);
    const creative = await makeCreative(hostA);
    await expect(
      createCampaign(hostA, { name: "x", creativeId: creative, screens: [{ screenId: screenB, spots: 1 }], ...window, mode: "house" }),
    ).rejects.toBeInstanceOf(ValidationError);
    // And a host-only org cannot buy advertiser campaigns.
    await expect(
      createCampaign(hostA, { name: "x", creativeId: creative, screens: [{ screenId: screenB, spots: 1 }], ...window, mode: "advertiser" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects legacy kiosks, paused creatives and bad dates", async () => {
    const host = await makeOrg("host");
    const screen = await makeScreen(host);
    const adv = await makeOrg("advertiser");
    const paused = await makeCreative(adv, { status: "paused" });
    const ok = await makeCreative(adv);
    await expect(
      createCampaign(adv, { name: "x", creativeId: paused, screens: [{ screenId: screen, spots: 1 }], ...window, mode: "advertiser" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createCampaign(adv, { name: "x", creativeId: ok, screens: [{ screenId: "scr_nope", spots: 1 }], ...window, mode: "advertiser" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createCampaign(adv, { name: "x", creativeId: ok, screens: [{ screenId: screen, spots: 1 }], startsAt: window.endsAt, endsAt: window.startsAt, mode: "advertiser" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("playlist", () => {
  it("returns active, in-date campaigns weighted by spots, and drops paused ones", async () => {
    const host = await makeOrg("host");
    const screen = await makeScreen(host);
    const a = await makeOrg("advertiser");
    const b = await makeOrg("advertiser");
    const ca = await createCampaign(a, { name: "A", creativeId: await makeCreative(a), screens: [{ screenId: screen, spots: 2 }], ...window, mode: "advertiser" });
    const cb = await createCampaign(b, { name: "B", creativeId: await makeCreative(b), screens: [{ screenId: screen, spots: 1 }], ...window, mode: "advertiser" });
    await createCampaign(b, {
      name: "futura",
      creativeId: await makeCreative(b),
      screens: [{ screenId: screen, spots: 1 }],
      startsAt: new Date(now + 5 * DAY),
      endsAt: new Date(now + 9 * DAY),
      mode: "advertiser",
    });

    const pl = await getPlaylist(screen);
    expect(pl?.items.map((i) => i.campaignId).sort()).toEqual([ca.id, cb.id].sort());
    expect(pl?.sequence).toEqual([ca.id, cb.id, ca.id]);

    await setCampaignStatus(b, cb.id, "paused");
    expect((await getPlaylist(screen))?.items.map((i) => i.campaignId)).toEqual([ca.id]);

    // Admin pauses the creative → gone on next refresh.
    const db = await getDb();
    await db.update(creatives).set({ status: "paused" }).where(eq(creatives.id, ca.creative.id));
    expect((await getPlaylist(screen))?.items).toEqual([]);
    expect(await getPlaylist("scr_missing")).toBeNull();
  });
});

describe("proof of play", () => {
  it("needs the screen token and drops impossible reports", async () => {
    const host = await makeOrg("host");
    const screen = await makeScreen(host, { tokenVersion: 3 });
    const adv = await makeOrg("advertiser");
    const creative = await makeCreative(adv);
    const c = await createCampaign(adv, { name: "A", creativeId: creative, screens: [{ screenId: screen, spots: 1 }], ...window, mode: "advertiser" });
    const t = now - 60_000;
    const good = { creativeId: creative, campaignId: c.id, startedAt: t, endedAt: t + 6000 };

    expect(await recordPlays(screen, "wrong", [good])).toEqual({ ok: false });
    expect(await recordPlays(screen, screenToken(screen, 2), [good])).toEqual({ ok: false });

    const token = screenToken(screen, 3);
    const res = await recordPlays(screen, token, [
      good,
      good, // duplicate
      { ...good, startedAt: t + 10_000, endedAt: t + 60_000 }, // longer than the creative
      { ...good, startedAt: now + 3_600_000, endedAt: now + 3_606_000 }, // future
      { ...good, startedAt: t - 8 * DAY, endedAt: t - 8 * DAY + 6000 }, // too old
      { ...good, campaignId: "cmp_other", startedAt: t + 20_000, endedAt: t + 26_000 }, // not on this screen
      { ...good, creativeId: "crv_other", startedAt: t + 30_000, endedAt: t + 36_000 }, // mismatched creative
    ]);
    expect(res).toEqual({ ok: true, accepted: 1 });
    // Re-sending the same batch (beacon retry) doesn't double count.
    expect(await recordPlays(screen, token, [good])).toEqual({ ok: true, accepted: 0 });
    const db = await getDb();
    expect(await db.select().from(plays)).toHaveLength(1);
  });
});
