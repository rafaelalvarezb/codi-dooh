import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { useTestDb } from "@/test/db";
import { DAY, makeCreative, makeOrg, makeScreen } from "@/test/fixtures";
import { getDb } from "@/lib/db";
import { campaigns, creatives, memberships, organizations, plays, screens, users } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { createCampaign } from "./campaigns";
import { ValidationError } from "./context";
import { getPlaylist } from "./playlist";
import {
  deleteOrg,
  listAllCampaigns,
  listAllCreatives,
  listOrgs,
  platformRevenue,
  setCampaignBilling,
  setCreativeStatus,
} from "./admin";

beforeEach(async () => {
  await useTestDb();
});

const now = Date.now();
const window = { startsAt: new Date(now - DAY), endsAt: new Date(now + 29 * DAY) };

async function scenario() {
  const host = await makeOrg("host", "Host");
  const screen = await makeScreen(host);
  const brand = await makeOrg("advertiser", "Marca");
  const creative = await makeCreative(brand);
  const campaign = await createCampaign(brand, {
    name: "Campaña",
    creativeId: creative,
    screens: [{ screenId: screen, spots: 1 }],
    ...window,
    mode: "advertiser",
  });
  return { host, screen, brand, creative, campaign };
}

describe("moderation", () => {
  it("pausing or rejecting a creative takes it off the playlist; reactivating brings it back", async () => {
    const { screen, creative } = await scenario();
    expect((await getPlaylist(screen))!.items).toHaveLength(1);

    await setCreativeStatus(creative, "rejected", "Contenido no permitido");
    expect((await getPlaylist(screen))!.items).toHaveLength(0);
    const [row] = (await listAllCreatives()).filter((c) => c.id === creative);
    expect(row).toMatchObject({ status: "rejected", moderationNote: "Contenido no permitido", orgName: "Marca", liveCampaigns: 1 });

    await setCreativeStatus(creative, "active", "ignorada");
    expect((await getPlaylist(screen))!.items).toHaveLength(1);
    expect((await listAllCreatives())[0].moderationNote).toBeNull();
  });
});

describe("campaign billing", () => {
  it("switches paid ↔ pilot but never touches house ads", async () => {
    const { host, campaign, screen } = await scenario();
    await setCampaignBilling(campaign.id, "pilot");
    expect((await listAllCampaigns()).find((c) => c.id === campaign.id)?.billing).toBe("pilot");

    const houseCreative = await makeCreative(host);
    const house = await createCampaign(host, {
      name: "Propio",
      creativeId: houseCreative,
      screens: [{ screenId: screen, spots: 1 }],
      ...window,
      mode: "house",
    });
    await expect(setCampaignBilling(house.id, "paid")).rejects.toBeInstanceOf(ValidationError);
  });

  it("counts paid campaigns as platform revenue and pilots apart", async () => {
    const { campaign } = await scenario();
    const paid = await platformRevenue(new Date());
    expect(paid.current.grossCents).toBeGreaterThan(0);
    expect(paid.current.platformCents + paid.current.hostCents).toBe(paid.current.grossCents);
    await setCampaignBilling(campaign.id, "pilot");
    const pilot = await platformRevenue(new Date());
    expect(pilot.current.grossCents).toBe(0);
    expect(pilot.current.pilotValueCents).toBe(paid.current.grossCents);
  });
});

describe("delete organization", () => {
  it("requires the exact name and removes everything the org owns", async () => {
    const { host, screen, brand, creative, campaign } = await scenario();
    const db = await getDb();
    const userId = newId("usr");
    await db.insert(users).values({ id: userId, email: "a@host.mx", name: "A", passwordHash: "x" });
    await db.insert(memberships).values({ userId, orgId: host.orgId });
    await db.insert(plays).values({
      id: newId("ply"),
      screenId: screen,
      creativeId: creative,
      campaignId: campaign.id,
      startedAt: new Date(now - 60_000),
      endedAt: new Date(now - 54_000),
    });

    await expect(deleteOrg(host.orgId, "Otro nombre")).rejects.toBeInstanceOf(ValidationError);
    await deleteOrg(host.orgId, "Host");

    expect(await db.select().from(organizations).where(eq(organizations.id, host.orgId))).toEqual([]);
    expect(await db.select().from(screens).where(eq(screens.id, screen))).toEqual([]);
    expect(await db.select().from(plays)).toEqual([]);
    expect(await db.select().from(users).where(eq(users.id, userId))).toEqual([]);
    // The advertiser's campaign survives, just without that screen.
    expect(await db.select().from(campaigns).where(eq(campaigns.id, campaign.id))).toHaveLength(1);

    // Deleting an advertiser with campaigns works too (campaigns before creatives).
    await deleteOrg(brand.orgId, "Marca");
    expect(await db.select().from(creatives)).toEqual([]);
    expect((await listOrgs()).map((o) => o.name)).toEqual([]);
  });
});
