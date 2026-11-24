import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { useTestDb } from "@/test/db";
import { DAY, makeCreative, makeOrg } from "@/test/fixtures";
import { getDb } from "@/lib/db";
import { campaigns, plays } from "@/lib/db/schema";
import { screenToken } from "@/lib/screen-token";
import { createCampaign } from "./campaigns";
import { NotFoundError, ValidationError } from "./context";
import {
  createScreen,
  createSite,
  getHostScreen,
  hostIncome,
  listHostScreens,
  onboardingState,
  rotateScreenToken,
  saveClabe,
  updateBusiness,
  updateScreen,
} from "./host";
import { recordPlays } from "./playlist";

beforeEach(async () => {
  await useTestDb();
});

describe("host onboarding", () => {
  it("walks business → CLABE → site → screen", async () => {
    const host = await makeOrg("host", "Estacionamiento Sur");
    expect((await onboardingState(host)).next).toBe("business");

    await updateBusiness(host, { name: "Estacionamiento Sur", legalName: "Operadora Sur SA de CV" });
    expect((await onboardingState(host)).next).toBe("clabe");

    await expect(saveClabe(host, { clabe: "012180001234567890", holder: "Operadora Sur" })).rejects.toBeInstanceOf(ValidationError);
    const saved = await saveClabe(host, { clabe: "012 180 001234567899", holder: "Operadora Sur" });
    expect(saved).toMatchObject({ bankName: "BBVA México", clabe: "012180001234567899" });
    expect((await onboardingState(host)).next).toBe("site");

    const site = await createSite(host, { name: "Sur · Nivel 1", address: "Calle 1", kind: "vending" });
    expect((await onboardingState(host)).next).toBe("screen");

    const screenId = await createScreen(host, { siteId: site, name: "Caseta 1" });
    const state = await onboardingState(host);
    expect(state.complete).toBe(true);
    expect(state.org).toMatchObject({ clabe: "012180001234567899", bankCode: "012", legalName: "Operadora Sur SA de CV" });

    const screen = await getHostScreen(host, screenId);
    expect(screen).toMatchObject({ tokenVersion: 1, profile: "laundry", acceptsAds: true, status: "unknown" });
  });

  it("an advertiser-only org cannot onboard as host", async () => {
    const brand = await makeOrg("advertiser");
    await expect(createSite(brand, { name: "x", address: "", kind: "parking" })).rejects.toBeInstanceOf(ValidationError);
    await expect(saveClabe(brand, { clabe: "012180001234567899", holder: "x" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("host isolation", () => {
  it("a host cannot see, rotate, edit or add screens to another host", async () => {
    const a = await makeOrg("host", "A");
    const b = await makeOrg("host", "B");
    const siteA = await createSite(a, { name: "A", address: "", kind: "parking" });
    const screenA = await createScreen(a, { siteId: siteA, name: "Caseta A" });

    await expect(getHostScreen(b, screenA)).rejects.toBeInstanceOf(NotFoundError);
    await expect(rotateScreenToken(b, screenA)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateScreen(b, screenA, { acceptsAds: false })).rejects.toBeInstanceOf(NotFoundError);
    await expect(createScreen(b, { siteId: siteA, name: "Intrusa" })).rejects.toBeInstanceOf(NotFoundError);
    expect(await listHostScreens(b)).toEqual([]);
    expect((await getHostScreen(a, screenA)).tokenVersion).toBe(1);
  });
});

describe("token rotation", () => {
  it("kills the old kiosk link for proof of play", async () => {
    const host = await makeOrg("host");
    const site = await createSite(host, { name: "S", address: "", kind: "parking" });
    const screen = await createScreen(host, { siteId: site, name: "Caseta" });
    const brand = await makeOrg("advertiser");
    const creative = await makeCreative(brand);
    const now = Date.now();
    const campaign = await createCampaign(brand, {
      name: "C",
      creativeId: creative,
      screens: [{ screenId: screen, spots: 1 }],
      startsAt: new Date(now - DAY),
      endsAt: new Date(now + DAY),
      mode: "advertiser",
    });
    const oldToken = screenToken(screen, 1);
    const report = (startedAt: number) => [
      { creativeId: creative, campaignId: campaign.id, startedAt, endedAt: startedAt + 6000 },
    ];

    expect((await recordPlays(screen, oldToken, report(now - 60_000))).ok).toBe(true);
    expect(await rotateScreenToken(host, screen)).toBe(2);
    expect((await recordPlays(screen, oldToken, report(now - 30_000))).ok).toBe(false);
    expect((await recordPlays(screen, screenToken(screen, 2), report(now - 20_000))).ok).toBe(true);

    const db = await getDb();
    expect(await db.select().from(plays).where(eq(plays.screenId, screen))).toHaveLength(2);
  });
});

describe("host income", () => {
  it("books paid campaigns 70/30, shows pilots apart and ignores other hosts", async () => {
    const host = await makeOrg("host");
    const other = await makeOrg("host", "Otro");
    const site = await createSite(host, { name: "S", address: "", kind: "parking" });
    const mine = await createScreen(host, { siteId: site, name: "Mía" });
    const otherSite = await createSite(other, { name: "O", address: "", kind: "parking" });
    const theirs = await createScreen(other, { siteId: otherSite, name: "Ajena" });
    const brand = await makeOrg("advertiser");
    const creative = await makeCreative(brand);

    // Middle of a Mexico City month, so the whole window falls in one month.
    const now = new Date("2026-11-21T18:00:00Z");
    const startsAt = new Date("2026-11-11T18:00:00Z");
    const endsAt = new Date("2026-12-11T18:00:00Z"); // 30 days
    const paid = await createCampaign(brand, {
      name: "Pagada",
      creativeId: creative,
      screens: [
        { screenId: mine, spots: 2 },
        { screenId: theirs, spots: 1 },
      ],
      startsAt,
      endsAt,
      mode: "advertiser",
    });
    const pilot = await createCampaign(brand, {
      name: "Piloto",
      creativeId: creative,
      screens: [{ screenId: mine, spots: 1 }],
      startsAt,
      endsAt,
      mode: "advertiser",
    });
    const db = await getDb();
    await db.update(campaigns).set({ billing: "pilot" }).where(eq(campaigns.id, pilot.id));

    const income = await hostIncome(host, now);
    // 2 spots × $1,000 × 10 of 30 days elapsed = $666.67 gross on my screen.
    const gross = Math.round((2 * 100_000) / 3);
    expect(income.current.grossCents).toBe(gross);
    expect(income.current.hostCents).toBe(gross - Math.round(gross * 0.3));
    expect(income.current.pilotValueCents).toBe(Math.round(100_000 / 3)); // 1 spot, 10 of 30 days
    expect(income.byScreen).toEqual([{ screenId: mine, name: "Mía", grossCents: gross, hostCents: income.current.hostCents }]);
    expect(income.months).toHaveLength(6);
    expect(income.payout).toMatchObject({ closed: false, year: 2026, month: 11, hostCents: income.current.hostCents });
    expect(paid.billing).toBe("paid");
  });
});
