import { beforeEach, describe, expect, it } from "vitest";
import { useTestDb } from "@/test/db";
import { DAY, makeCreative, makeOrg, makeScreen } from "@/test/fixtures";
import { getDb } from "@/lib/db";
import { payments, plays } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { attendedPaymentsByCampaign, type AttentionPayment, type AttentionPlay } from "@/lib/attention";
import { createCampaign } from "./campaigns";
import { NotFoundError } from "./context";
import {
  advertiserTotals,
  attendedPaymentCounts,
  campaignAnalytics,
  dayKeysBetween,
  hostAnalytics,
  mxDayKey,
  platformTotals,
  trimLeadingEmptyDays,
} from "./analytics";

beforeEach(async () => {
  await useTestDb();
});

const NOW = new Date("2026-11-20T20:00:00Z"); // 14:00 in Mexico City

async function setup() {
  const host = await makeOrg("host");
  const screenA = await makeScreen(host);
  const screenB = await makeScreen(host);
  const brand = await makeOrg("advertiser", "Marca");
  const creative = await makeCreative(brand);
  const campaign = await createCampaign(brand, {
    name: "Lanzamiento",
    creativeId: creative,
    screens: [
      { screenId: screenA, spots: 2 },
      { screenId: screenB, spots: 1 },
    ],
    startsAt: new Date(NOW.getTime() - 10 * DAY),
    endsAt: new Date(NOW.getTime() + 20 * DAY),
    mode: "advertiser",
  });
  return { host, screenA, screenB, brand, creative, campaign };
}

async function addPlay(screenId: string, creativeId: string, campaignId: string | null, start: Date, sec = 6, isDemo = false) {
  const db = await getDb();
  const row = {
    id: newId("ply"),
    screenId,
    creativeId,
    campaignId,
    startedAt: start,
    endedAt: new Date(start.getTime() + sec * 1000),
    isDemo,
  };
  await db.insert(plays).values(row);
  return row;
}

async function addPayment(machineId: string, created: Date, paid: Date | null, amountCents = 100, isDemo = false) {
  const db = await getDb();
  const row = {
    qrId: newId("qr"),
    machineId,
    status: paid ? ("PAID" as const) : ("PENDING" as const),
    amountCents,
    createdAt: created,
    paidAt: paid,
    isDemo,
  };
  await db.insert(payments).values(row);
  return row;
}

const sec = (base: Date, s: number) => new Date(base.getTime() + s * 1000);

describe("verified attention (SQL)", () => {
  it("matches the pure implementation on mixed data", async () => {
    const { screenA, screenB, creative, campaign, brand } = await setup();
    const other = await createCampaign(brand, {
      name: "Otra",
      creativeId: creative,
      screens: [{ screenId: screenA, spots: 1 }],
      startsAt: new Date(NOW.getTime() - DAY),
      endsAt: new Date(NOW.getTime() + DAY),
      mode: "advertiser",
    });
    const base = new Date(NOW.getTime() - 3600_000);
    const allPlays: AttentionPlay[] = [];
    const allPays: AttentionPayment[] = [];
    // Deterministic pseudo-random scatter of plays and payments on two screens.
    let seed = 7;
    const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      const screen = i % 3 === 0 ? screenB : screenA;
      const cmp = screen === screenA && i % 4 === 0 ? other.id : campaign.id;
      const demo = i % 11 === 0;
      allPlays.push(await addPlay(screen, creative, cmp, sec(base, i * 7), 6, demo));
    }
    for (let i = 0; i < 25; i++) {
      const screen = rnd() < 0.5 ? screenA : screenB;
      const created = sec(base, Math.floor(rnd() * 450) - 20);
      const paid = rnd() < 0.15 ? null : sec(created, Math.floor(rnd() * 40) - 2);
      const demo = rnd() < 0.1;
      allPays.push(await addPayment(screen, created, paid, 100, demo));
    }
    // A payment on another machine never counts.
    allPays.push(await addPayment("parking", sec(base, 0), sec(base, 3)));

    const expected = attendedPaymentsByCampaign(allPlays, allPays);
    const got = await attendedPaymentCounts([campaign.id, other.id]);
    expect(got.get(campaign.id) ?? 0).toBe(expected.get(campaign.id)?.size ?? 0);
    expect(got.get(other.id) ?? 0).toBe(expected.get(other.id)?.size ?? 0);
    expect((expected.get(campaign.id)?.size ?? 0) > 0).toBe(true);
  });
});

describe("campaignAnalytics", () => {
  it("summarises plays, airtime, hours, screens and attended payments", async () => {
    const { screenA, screenB, creative, campaign, brand } = await setup();
    // 13:00 Mexico City = 19:00 UTC.
    const one = new Date("2026-11-19T19:00:00Z");
    await addPlay(screenA, creative, campaign.id, one);
    await addPlay(screenA, creative, campaign.id, sec(one, 30));
    await addPlay(screenB, creative, campaign.id, new Date("2026-11-20T02:30:00Z")); // 20:30 on the 19th, MX
    await addPayment(screenA, sec(one, -20), sec(one, 3), 2500); // during play 1
    await addPayment(screenA, sec(one, 28), sec(one, 40), 1000); // during play 2
    await addPayment(screenB, sec(one, 0), sec(one, 3), 999); // different screen, no play there then

    const a = await campaignAnalytics(brand, campaign.id, NOW);
    expect(a.plays).toBe(3);
    expect(a.airtimeMs).toBe(18_000);
    expect(a.screensWithPlays).toBe(2);
    expect(a.sitesWithPlays).toBe(2);
    expect(a.attendedPayments).toBe(2);
    expect(a.attendedAmountCents).toBe(3500);
    expect(a.byHour[13]).toBe(2);
    expect(a.byHour[20]).toBe(1);
    expect(a.byDay.find((d) => d.day === "2026-11-19")?.value).toBe(3);
    expect(a.byDay.at(-1)?.day).toBe("2026-11-20");
    expect(a.byScreen.find((s) => s.screenId === screenA)).toMatchObject({ plays: 2, attendedPayments: 2, spots: 2 });
    // 10 of 30 days elapsed → a third of the booking.
    expect(a.toDateCents).toBe(Math.round(a.totalCents / 3));
    expect(a.costPerPlayCents).toBe(Math.round(a.toDateCents / 3));
    expect(a.costPerAttendedPaymentCents).toBe(Math.round(a.toDateCents / 2));

    const totals = await advertiserTotals(brand);
    expect(totals).toMatchObject({ plays: 3, airtimeMs: 18_000, screens: 2, attendedPayments: 2 });
  });

  it("does not let another advertiser read a campaign's analytics", async () => {
    const { campaign, creative, screenA } = await setup();
    await addPlay(screenA, creative, campaign.id, sec(NOW, -60));
    const intruder = await makeOrg("advertiser", "Intrusa");
    await expect(campaignAnalytics(intruder, campaign.id, NOW)).rejects.toBeInstanceOf(NotFoundError);
    expect(await advertiserTotals(intruder)).toMatchObject({ plays: 0, attendedPayments: 0 });
  });
});

describe("hostAnalytics", () => {
  it("only covers the host's own screens", async () => {
    const { host, screenA, creative, campaign } = await setup();
    const otherHost = await makeOrg("host", "Otro host");
    const otherScreen = await makeScreen(otherHost);
    await addPlay(screenA, creative, campaign.id, sec(NOW, -600));
    await addPlay(otherScreen, creative, null, sec(NOW, -600));
    await addPayment(screenA, sec(NOW, -500), sec(NOW, -480), 4200);
    await addPayment(otherScreen, sec(NOW, -500), sec(NOW, -480), 9900);

    const h = await hostAnalytics(host, NOW);
    expect(h).not.toBeNull();
    expect(h!.plays).toBe(1);
    expect(h!.payments).toBe(1);
    expect(h!.paymentsAmountCents).toBe(4200);
    expect(h!.screens).toHaveLength(2);
    expect(h!.screens.find((s) => s.id === screenA)).toMatchObject({ plays: 1, payments: 1, paymentsAmountCents: 4200 });
    expect(h!.screens.some((s) => s.id === otherScreen)).toBe(false);
    expect(h!.ads.map((a) => a.campaignId)).toEqual([campaign.id]);
    // Leading empty days are trimmed (min 7 days kept).
    expect(h!.playsByDay).toHaveLength(7);
    expect(h!.paymentsByDay).toHaveLength(7);

    const o = await hostAnalytics(otherHost, NOW);
    expect(o!.paymentsAmountCents).toBe(9900);
    expect(o!.ads).toEqual([]);

    expect(await hostAnalytics(await makeOrg("host", "Sin pantallas"), NOW)).toBeNull();
  });
});

describe("platformTotals", () => {
  it("aggregates across all orgs", async () => {
    const { screenA, creative, campaign } = await setup();
    await addPlay(screenA, creative, campaign.id, sec(NOW, -600));
    await addPayment(screenA, sec(NOW, -610), sec(NOW, -598), 500);
    const t = await platformTotals(NOW);
    expect(t).toMatchObject({ plays: 1, payments: 1, paymentsAmountCents: 500, attendedPayments: 1, hosts: 1, advertisers: 1, activeCampaigns: 1, screens: 2 });
  });
});

describe("day helpers", () => {
  it("trims leading empty days across series together", () => {
    const mk = (vals: number[]) => vals.map((value, i) => ({ day: `d${i}`, value }));
    const [a, b] = trimLeadingEmptyDays([mk([0, 0, 0, 1, 0, 0, 0, 0, 0, 2]), mk([0, 0, 3, 0, 0, 0, 0, 0, 0, 0])], 3);
    expect(a.map((p) => p.day)[0]).toBe("d2");
    expect(b[0].value).toBe(3);
    expect(trimLeadingEmptyDays([mk([0, 0, 0, 0])], 3)[0]).toHaveLength(3);
  });

  it("buckets by Mexico City day", () => {
    expect(mxDayKey(new Date("2026-11-20T05:59:00Z"))).toBe("2026-11-19");
    expect(mxDayKey(new Date("2026-11-20T06:00:00Z"))).toBe("2026-11-20");
    expect(dayKeysBetween(new Date("2026-11-18T12:00:00Z"), new Date("2026-11-20T12:00:00Z"))).toEqual([
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ]);
    expect(dayKeysBetween(new Date("2026-01-01T12:00:00Z"), new Date("2026-11-20T12:00:00Z"), 5)).toHaveLength(5);
  });
});
