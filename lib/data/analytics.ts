/**
 * Analytics for advertisers, hosts and the platform admin.
 * Every advertiser/host query is scoped by the OrgCtx from the session.
 * Times are bucketed in Mexico City time (the screens are in Mexico).
 */
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, lte, sql, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, creatives, organizations, payments, plays, screens, sites } from "@/lib/db/schema";
import { ATTENTION_MAX_WINDOW_MS, costPer } from "@/lib/attention";
import { accruedCents, billedCents, campaignMarketValueCents, DAY_MS } from "@/lib/pricing";
import { machineStatus } from "@/lib/machines";
import { campaignState } from "./campaigns";
import { NotFoundError, type OrgCtx } from "./context";

export const TZ = "America/Mexico_City";
const MAX_DAYS_IN_CHART = 60;

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "YYYY-MM-DD" in Mexico City time. */
export function mxDayKey(d: Date): string {
  return dayKeyFmt.format(d);
}

/** Every Mexico City day key from `from` to `to` (inclusive), at most `max` (the latest ones). */
export function dayKeysBetween(from: Date, to: Date, max = MAX_DAYS_IN_CHART): string[] {
  const keys: string[] = [];
  if (to < from) return keys;
  const last = mxDayKey(to);
  for (let t = from.getTime(); ; t += DAY_MS) {
    const key = mxDayKey(new Date(Math.min(t, to.getTime())));
    if (keys[keys.length - 1] !== key) keys.push(key);
    if (key === last || t > to.getTime()) break;
  }
  return keys.slice(-max);
}

export type DayPoint = { day: string; value: number };

function fillDays(keys: string[], rows: Array<{ day: string; n: number }>): DayPoint[] {
  const map = new Map(rows.map((r) => [r.day, r.n]));
  return keys.map((day) => ({ day, value: map.get(day) ?? 0 }));
}

/** Drops leading days where every series is zero, keeping at least `min` days. */
export function trimLeadingEmptyDays(series: DayPoint[][], min = 7): DayPoint[][] {
  const len = series[0]?.length ?? 0;
  let first = 0;
  while (first < len - min && series.every((s) => s[first].value === 0)) first++;
  return series.map((s) => s.slice(first));
}

function fillHours(rows: Array<{ hour: number; n: number }>): number[] {
  const out = Array.from({ length: 24 }, () => 0);
  for (const r of rows) if (r.hour >= 0 && r.hour < 24) out[r.hour] = r.n;
  return out;
}

const dayExpr = sql<string>`to_char(${plays.startedAt} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`;
const hourExpr = sql<number>`extract(hour from ${plays.startedAt} at time zone ${sql.raw(`'${TZ}'`)})::int`;
const airtimeExpr = sql<number>`coalesce(sum(extract(epoch from (${plays.endedAt} - ${plays.startedAt})) * 1000), 0)`;

/**
 * Join condition between plays and payments for verified attention.
 * Mirrors overlaps() in lib/attention.ts.
 */
const attentionJoin = and(
  eq(payments.machineId, plays.screenId),
  eq(payments.isDemo, plays.isDemo),
  eq(payments.status, "PAID"),
  isNotNull(payments.paidAt),
  sql`least(greatest(${payments.createdAt}, ${payments.paidAt} - make_interval(secs => ${ATTENTION_MAX_WINDOW_MS / 1000})), ${payments.paidAt}) <= ${plays.endedAt}`,
  sql`${payments.paidAt} >= ${plays.startedAt}`,
)!;

/** Distinct (campaign, screen, payment) triples paid while the campaign was on air. */
async function attendedRows(where: SQL) {
  const db = await getDb();
  const att = db
    .selectDistinct({
      campaignId: sql<string>`${plays.campaignId}`.as("campaign_id"),
      screenId: sql<string>`${plays.screenId}`.as("screen_id"),
      qrId: sql<string>`${payments.qrId}`.as("qr_id"),
      amountCents: sql<number | null>`${payments.amountCents}`.as("amount_cents"),
    })
    .from(plays)
    .innerJoin(payments, attentionJoin)
    .where(and(isNotNull(plays.campaignId), where))
    .as("att");
  return db
    .select({
      campaignId: att.campaignId,
      screenId: att.screenId,
      payments: count(),
      amountCents: sql<number>`coalesce(sum(${att.amountCents}), 0)`.mapWith(Number),
    })
    .from(att)
    .groupBy(att.campaignId, att.screenId);
}

/** campaignId → number of distinct payments made while it was on screen. Exported for tests. */
export async function attendedPaymentCounts(campaignIds: string[]): Promise<Map<string, number>> {
  if (campaignIds.length === 0) return new Map();
  const db = await getDb();
  const att = db
    .selectDistinct({
      campaignId: sql<string>`${plays.campaignId}`.as("campaign_id"),
      qrId: sql<string>`${payments.qrId}`.as("qr_id"),
    })
    .from(plays)
    .innerJoin(payments, attentionJoin)
    .where(inArray(plays.campaignId, campaignIds))
    .as("att");
  const rows = await db.select({ campaignId: att.campaignId, n: count() }).from(att).groupBy(att.campaignId);
  return new Map(rows.map((r) => [r.campaignId, Number(r.n)]));
}

// ---------------------------------------------------------------------------
// Advertiser
// ---------------------------------------------------------------------------

export type CampaignAnalytics = Awaited<ReturnType<typeof campaignAnalytics>>;

export async function campaignAnalytics(ctx: OrgCtx, campaignId: string, now = new Date()) {
  const db = await getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, ctx.orgId)));
  if (!campaign) throw new NotFoundError("Campaña");

  const targets = await db
    .select({
      screenId: campaignScreens.screenId,
      spots: campaignScreens.spots,
      name: screens.name,
      siteId: screens.siteId,
      siteName: sites.name,
    })
    .from(campaignScreens)
    .innerJoin(screens, eq(screens.id, campaignScreens.screenId))
    .leftJoin(sites, eq(sites.id, screens.siteId))
    .where(eq(campaignScreens.campaignId, campaignId));

  const mine = eq(plays.campaignId, campaignId);
  const [totals, byDayRows, byHourRows, byScreenRows, attended] = await Promise.all([
    db
      .select({
        plays: count(),
        airtimeMs: airtimeExpr.mapWith(Number),
        screens: countDistinct(plays.screenId),
        lastPlayAt: sql<Date | null>`max(${plays.startedAt})`.mapWith((v) => (v ? new Date(v) : null)),
      })
      .from(plays)
      .where(mine),
    db.select({ day: dayExpr, n: count() }).from(plays).where(mine).groupBy(dayExpr),
    db.select({ hour: hourExpr, n: count() }).from(plays).where(mine).groupBy(hourExpr),
    db.select({ screenId: plays.screenId, n: count() }).from(plays).where(mine).groupBy(plays.screenId),
    attendedRows(mine),
  ]);

  const t = totals[0];
  const playsByScreen = new Map(byScreenRows.map((r) => [r.screenId, Number(r.n)]));
  const attendedByScreen = new Map(attended.map((r) => [r.screenId, Number(r.payments)]));
  const attendedPayments = attended.reduce((acc, r) => acc + Number(r.payments), 0);
  const attendedAmountCents = attended.reduce((acc, r) => acc + r.amountCents, 0);

  const marketValueCents = campaignMarketValueCents({
    spotPriceCents: campaign.spotPriceCents,
    screens: targets,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
  });
  // Pilots show cost at market value (what it would have cost); house ads cost nothing.
  const totalCents = campaign.billing === "pilot" ? marketValueCents : billedCents(campaign.billing, marketValueCents);
  const toDateCents = accruedCents(totalCents, campaign.startsAt, campaign.endsAt, now);

  const chartEnd = now < campaign.endsAt ? now : campaign.endsAt;
  const sitesWithPlays = new Set(targets.filter((s) => playsByScreen.has(s.screenId)).map((s) => s.siteId ?? s.screenId));

  return {
    billing: campaign.billing,
    plays: Number(t.plays),
    airtimeMs: t.airtimeMs,
    screensWithPlays: Number(t.screens),
    sitesWithPlays: sitesWithPlays.size,
    screensBooked: targets.length,
    lastPlayAt: t.lastPlayAt,
    attendedPayments,
    attendedAmountCents,
    totalCents,
    toDateCents,
    costPerPlayCents: costPer(toDateCents, Number(t.plays)),
    costPerAttendedPaymentCents: costPer(toDateCents, attendedPayments),
    byDay: now < campaign.startsAt ? [] : fillDays(dayKeysBetween(campaign.startsAt, chartEnd), byDayRows.map((r) => ({ day: r.day, n: Number(r.n) }))),
    byHour: fillHours(byHourRows.map((r) => ({ hour: Number(r.hour), n: Number(r.n) }))),
    byScreen: targets
      .map((s) => ({
        screenId: s.screenId,
        name: s.name,
        siteName: s.siteName,
        spots: s.spots,
        plays: playsByScreen.get(s.screenId) ?? 0,
        attendedPayments: attendedByScreen.get(s.screenId) ?? 0,
      }))
      .sort((a, b) => b.plays - a.plays),
  };
}

/** Totals across the org's advertiser campaigns (excludes house ads). */
export async function advertiserTotals(ctx: OrgCtx) {
  const db = await getDb();
  const own = and(eq(campaigns.orgId, ctx.orgId), sql`${campaigns.billing} <> 'house'`);
  const [t] = await db
    .select({ plays: count(), airtimeMs: airtimeExpr.mapWith(Number), screens: countDistinct(plays.screenId) })
    .from(plays)
    .innerJoin(campaigns, eq(campaigns.id, plays.campaignId))
    .where(own);
  const ids = await db.select({ id: campaigns.id }).from(campaigns).where(own);
  const scopedPlays = inArray(
    plays.campaignId,
    ids.map((r) => r.id),
  );
  const attended = ids.length ? await distinctAttendedPayments(scopedPlays) : 0;
  return { plays: Number(t.plays), airtimeMs: t.airtimeMs, screens: Number(t.screens), attendedPayments: attended };
}

/** Distinct payments (not per campaign) that overlapped any matching play. */
async function distinctAttendedPayments(where: SQL): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: countDistinct(payments.qrId) })
    .from(plays)
    .innerJoin(payments, attentionJoin)
    .where(and(isNotNull(plays.campaignId), where));
  return Number(row?.n ?? 0);
}

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

export const HOST_WINDOW_DAYS = 30;

export type HostAnalytics = Awaited<ReturnType<typeof hostAnalytics>>;

export async function hostAnalytics(ctx: OrgCtx, now = new Date()) {
  const db = await getDb();
  const since = new Date(now.getTime() - (HOST_WINDOW_DAYS - 1) * DAY_MS);
  const own = await db
    .select({
      id: screens.id,
      name: screens.name,
      siteName: sites.name,
      lastSeenAt: screens.lastSeenAt,
      tokenVersion: screens.tokenVersion,
      isDemo: screens.isDemo,
    })
    .from(screens)
    .leftJoin(sites, eq(sites.id, screens.siteId))
    .where(eq(screens.orgId, ctx.orgId))
    .orderBy(screens.name);
  const ids = own.map((s) => s.id);
  if (ids.length === 0) return null;

  const playsWhere = and(inArray(plays.screenId, ids), gte(plays.startedAt, since));
  const paidWhere = and(
    inArray(payments.machineId, ids),
    eq(payments.status, "PAID"),
    isNotNull(payments.paidAt),
    gte(payments.paidAt, since),
  );
  const payDay = sql<string>`to_char(${payments.paidAt} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`;

  const [playTotals, playsByScreen, playsByDay, playsByHour, payByScreen, payByDay, running] = await Promise.all([
    db.select({ plays: count(), airtimeMs: airtimeExpr.mapWith(Number) }).from(plays).where(playsWhere),
    db.select({ screenId: plays.screenId, n: count() }).from(plays).where(playsWhere).groupBy(plays.screenId),
    db.select({ day: dayExpr, n: count() }).from(plays).where(playsWhere).groupBy(dayExpr),
    db.select({ hour: hourExpr, n: count() }).from(plays).where(playsWhere).groupBy(hourExpr),
    db
      .select({ screenId: payments.machineId, n: count(), amount: sum(payments.amountCents).mapWith(Number) })
      .from(payments)
      .where(paidWhere)
      .groupBy(payments.machineId),
    db.select({ day: payDay, n: count() }).from(payments).where(paidWhere).groupBy(payDay),
    db
      .select({
        campaignId: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        startsAt: campaigns.startsAt,
        endsAt: campaigns.endsAt,
        billing: campaigns.billing,
        isDemo: campaigns.isDemo,
        advertiser: organizations.name,
        advertiserId: organizations.id,
        creativeStatus: creatives.status,
        posterUrl: creatives.posterUrl,
        blobUrl: creatives.blobUrl,
        screens: countDistinct(campaignScreens.screenId),
        spots: sum(campaignScreens.spots).mapWith(Number),
      })
      .from(campaignScreens)
      .innerJoin(campaigns, eq(campaigns.id, campaignScreens.campaignId))
      .innerJoin(organizations, eq(organizations.id, campaigns.orgId))
      .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
      .where(and(inArray(campaignScreens.screenId, ids), gte(campaigns.endsAt, now), lte(campaigns.startsAt, now)))
      .groupBy(campaigns.id, organizations.id, creatives.id)
      .orderBy(desc(campaigns.startsAt)),
  ]);

  const playMap = new Map(playsByScreen.map((r) => [r.screenId, Number(r.n)]));
  const payMap = new Map(payByScreen.map((r) => [r.screenId, { n: Number(r.n), amount: r.amount ?? 0 }]));
  const [playsDays, paymentsDays] = trimLeadingEmptyDays([
    fillDays(dayKeysBetween(since, now), playsByDay.map((r) => ({ day: r.day, n: Number(r.n) }))),
    fillDays(dayKeysBetween(since, now), payByDay.map((r) => ({ day: r.day, n: Number(r.n) }))),
  ]);

  return {
    windowDays: HOST_WINDOW_DAYS,
    plays: Number(playTotals[0].plays),
    airtimeMs: playTotals[0].airtimeMs,
    payments: payByScreen.reduce((acc, r) => acc + Number(r.n), 0),
    paymentsAmountCents: payByScreen.reduce((acc, r) => acc + (r.amount ?? 0), 0),
    playsByDay: playsDays,
    paymentsByDay: paymentsDays,
    playsByHour: fillHours(playsByHour.map((r) => ({ hour: Number(r.hour), n: Number(r.n) }))),
    screens: own.map((s) => ({
      id: s.id,
      name: s.name,
      siteName: s.siteName,
      isDemo: s.isDemo,
      linked: s.tokenVersion != null,
      status: machineStatus(s.lastSeenAt, now.getTime()),
      lastSeenAt: s.lastSeenAt,
      plays: playMap.get(s.id) ?? 0,
      payments: payMap.get(s.id)?.n ?? 0,
      paymentsAmountCents: payMap.get(s.id)?.amount ?? 0,
    })),
    ads: running
      .map((r) => ({ ...r, state: campaignState(r, r.creativeStatus, now), own: r.advertiserId === ctx.orgId }))
      .filter((r) => r.state === "active"),
  };
}

// ---------------------------------------------------------------------------
// Platform admin (global, no org scope — only call behind an admin check)
// ---------------------------------------------------------------------------

export async function platformTotals(now = new Date()) {
  const db = await getDb();
  const since = new Date(now.getTime() - (HOST_WINDOW_DAYS - 1) * DAY_MS);
  const [[p], [pay], [att], [orgs], [cmp], [scr]] = await Promise.all([
    db
      .select({ plays: count(), airtimeMs: airtimeExpr.mapWith(Number) })
      .from(plays)
      .where(gte(plays.startedAt, since)),
    db
      .select({ n: count(), amount: sql<number>`coalesce(sum(${payments.amountCents}), 0)`.mapWith(Number) })
      .from(payments)
      .where(and(eq(payments.status, "PAID"), gte(payments.paidAt, since))),
    db
      .select({ n: countDistinct(payments.qrId) })
      .from(plays)
      .innerJoin(payments, attentionJoin)
      .where(and(isNotNull(plays.campaignId), gte(plays.startedAt, since))),
    db
      .select({
        hosts: sql<number>`count(*) filter (where ${organizations.kind} in ('host','both'))`.mapWith(Number),
        advertisers: sql<number>`count(*) filter (where ${organizations.kind} in ('advertiser','both'))`.mapWith(Number),
      })
      .from(organizations),
    db
      .select({ n: count() })
      .from(campaigns)
      .where(and(eq(campaigns.status, "active"), lte(campaigns.startsAt, now), gte(campaigns.endsAt, now))),
    db
      .select({
        total: count(),
        online: sql<number>`count(*) filter (where ${screens.lastSeenAt} > ${new Date(now.getTime() - 5 * 60_000)})`.mapWith(Number),
      })
      .from(screens)
      .where(isNotNull(screens.orgId)),
  ]);
  return {
    windowDays: HOST_WINDOW_DAYS,
    plays: Number(p.plays),
    airtimeMs: p.airtimeMs,
    payments: Number(pay.n),
    paymentsAmountCents: pay.amount,
    attendedPayments: Number(att.n),
    hosts: orgs.hosts,
    advertisers: orgs.advertisers,
    activeCampaigns: Number(cmp.n),
    screens: Number(scr.total),
    screensOnline: scr.online,
  };
}
