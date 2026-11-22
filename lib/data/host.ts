/** Host onboarding, screens and income. Always scoped to the caller's org. */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, organizations, screens, sites } from "@/lib/db/schema";
import { canHost } from "@/lib/auth/roles";
import { validateClabe } from "@/lib/clabe";
import { newId } from "@/lib/ids";
import { machineStatus } from "@/lib/machines";
import { nextPayout, periodRevenue, recentMonths, type Booking } from "@/lib/revenue";
import { getSettings } from "@/lib/settings";
import { NotFoundError, ValidationError, type OrgCtx } from "./context";

export const SITE_KINDS = ["parking", "restroom", "laundry", "vending"] as const;
export type SiteKind = (typeof SITE_KINDS)[number];
export const SCREEN_PROFILES = ["parking", "bathroom", "laundry"] as const;
export type ScreenProfile = (typeof SCREEN_PROFILES)[number];

/** Suggested kiosk checkout flow for each kind of site. */
export const DEFAULT_PROFILE: Record<SiteKind, ScreenProfile> = {
  parking: "parking",
  restroom: "bathroom",
  laundry: "laundry",
  vending: "laundry",
};

function assertHost(ctx: OrgCtx) {
  if (!canHost(ctx.kind)) throw new ValidationError("Tu cuenta no es de host.");
}

export async function getHostOrg(ctx: OrgCtx) {
  const db = await getDb();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, ctx.orgId));
  if (!org) throw new NotFoundError("Organización");
  return org;
}

/** Where the host is in onboarding: business → CLABE → site → screen. */
export async function onboardingState(ctx: OrgCtx) {
  const db = await getDb();
  const org = await getHostOrg(ctx);
  const [counts] = await db
    .select({
      sites: sql<number>`(select count(*) from ${sites} where ${sites.orgId} = ${ctx.orgId})`.mapWith(Number),
      screens: sql<number>`(select count(*) from ${screens} where ${screens.orgId} = ${ctx.orgId})`.mapWith(Number),
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId));
  const steps = {
    business: Boolean(org.legalName),
    clabe: Boolean(org.clabe),
    site: counts.sites > 0,
    screen: counts.screens > 0,
  };
  const next = (Object.keys(steps) as Array<keyof typeof steps>).find((k) => !steps[k]) ?? null;
  return { org, steps, next, complete: next === null };
}

export async function updateBusiness(ctx: OrgCtx, input: { name: string; legalName: string }) {
  assertHost(ctx);
  const db = await getDb();
  await db
    .update(organizations)
    .set({ name: input.name.trim(), legalName: input.legalName.trim() })
    .where(eq(organizations.id, ctx.orgId));
}

export async function saveClabe(ctx: OrgCtx, input: { clabe: string; holder: string }) {
  assertHost(ctx);
  const res = validateClabe(input.clabe);
  if (!res.ok) throw new ValidationError(res.error);
  const db = await getDb();
  await db
    .update(organizations)
    .set({ clabe: res.clabe, bankCode: res.bankCode, clabeHolder: input.holder.trim() })
    .where(eq(organizations.id, ctx.orgId));
  return res;
}

export async function listSites(ctx: OrgCtx) {
  const db = await getDb();
  return db.select().from(sites).where(eq(sites.orgId, ctx.orgId)).orderBy(asc(sites.createdAt));
}

export async function createSite(ctx: OrgCtx, input: { name: string; address: string; kind: SiteKind }) {
  assertHost(ctx);
  const db = await getDb();
  const id = newId("sit");
  await db.insert(sites).values({ id, orgId: ctx.orgId, name: input.name.trim(), address: input.address.trim(), kind: input.kind });
  return id;
}

export async function createScreen(
  ctx: OrgCtx,
  input: { siteId: string; name: string; profile?: ScreenProfile; acceptsAds?: boolean },
) {
  assertHost(ctx);
  const db = await getDb();
  const [site] = await db.select().from(sites).where(and(eq(sites.id, input.siteId), eq(sites.orgId, ctx.orgId)));
  if (!site) throw new NotFoundError("Sitio");
  const id = newId("scr");
  await db.insert(screens).values({
    id,
    siteId: site.id,
    orgId: ctx.orgId,
    name: input.name.trim(),
    location: site.name,
    profile: input.profile ?? DEFAULT_PROFILE[site.kind],
    tokenVersion: 1,
    tokenRotatedAt: new Date(),
    acceptsAds: input.acceptsAds ?? true,
  });
  return id;
}

export type HostScreen = Awaited<ReturnType<typeof getHostScreen>>;

export async function getHostScreen(ctx: OrgCtx, id: string, now = new Date()) {
  const db = await getDb();
  const [row] = await db
    .select({ screen: screens, site: sites })
    .from(screens)
    .leftJoin(sites, eq(sites.id, screens.siteId))
    .where(and(eq(screens.id, id), eq(screens.orgId, ctx.orgId)));
  if (!row) throw new NotFoundError("Pantalla");
  return { ...row.screen, site: row.site, status: machineStatus(row.screen.lastSeenAt, now.getTime()) };
}

export async function listHostScreens(ctx: OrgCtx, now = new Date()) {
  const db = await getDb();
  const rows = await db
    .select({ screen: screens, siteName: sites.name, siteKind: sites.kind })
    .from(screens)
    .leftJoin(sites, eq(sites.id, screens.siteId))
    .where(eq(screens.orgId, ctx.orgId))
    .orderBy(asc(sites.name), asc(screens.name));
  return rows.map((r) => ({
    ...r.screen,
    siteName: r.siteName,
    siteKind: r.siteKind,
    status: machineStatus(r.screen.lastSeenAt, now.getTime()),
  }));
}

/** Invalidates the old kiosk link: the next token is derived from version + 1. */
export async function rotateScreenToken(ctx: OrgCtx, id: string) {
  assertHost(ctx);
  const db = await getDb();
  const [row] = await db
    .update(screens)
    .set({ tokenVersion: sql`coalesce(${screens.tokenVersion}, 0) + 1`, tokenRotatedAt: new Date() })
    .where(and(eq(screens.id, id), eq(screens.orgId, ctx.orgId)))
    .returning({ tokenVersion: screens.tokenVersion });
  if (!row) throw new NotFoundError("Pantalla");
  return row.tokenVersion!;
}

export async function updateScreen(ctx: OrgCtx, id: string, patch: { name?: string; acceptsAds?: boolean }) {
  assertHost(ctx);
  const db = await getDb();
  const set: Partial<typeof screens.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name.trim();
  if (patch.acceptsAds !== undefined) set.acceptsAds = patch.acceptsAds;
  if (Object.keys(set).length === 0) return;
  const [row] = await db
    .update(screens)
    .set(set)
    .where(and(eq(screens.id, id), eq(screens.orgId, ctx.orgId)))
    .returning({ id: screens.id });
  if (!row) throw new NotFoundError("Pantalla");
}

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

/** Every campaign booking on the given screens (any advertiser). */
export async function bookingsOnScreens(screenIds: string[]): Promise<Booking[]> {
  if (screenIds.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      campaignId: campaigns.id,
      billing: campaigns.billing,
      spotPriceCents: campaigns.spotPriceCents,
      startsAt: campaigns.startsAt,
      endsAt: campaigns.endsAt,
      status: campaigns.status,
      screenId: campaignScreens.screenId,
      spots: campaignScreens.spots,
    })
    .from(campaignScreens)
    .innerJoin(campaigns, eq(campaigns.id, campaignScreens.campaignId))
    .where(inArray(campaignScreens.screenId, screenIds));
  // Drafts never ran. Paused campaigns are still booked (v1: no refunds on pause).
  return rows.filter((r) => r.status !== "draft");
}

export const LEDGER_MONTHS = 6;

export type HostIncome = Awaited<ReturnType<typeof hostIncome>>;

export async function hostIncome(ctx: OrgCtx, now = new Date()) {
  const db = await getDb();
  const own = await db.select({ id: screens.id, name: screens.name }).from(screens).where(eq(screens.orgId, ctx.orgId));
  const [bookings, settings, org] = await Promise.all([bookingsOnScreens(own.map((s) => s.id)), getSettings(), getHostOrg(ctx)]);

  const months = recentMonths(now, LEDGER_MONTHS).map((m) => ({
    year: m.year,
    month: m.month,
    ...periodRevenue(bookings, m, settings.commissionBps, now),
  }));
  const current = months[months.length - 1];
  const payout = nextPayout(now, settings.payoutDay);
  const payoutRevenue = periodRevenue(bookings, payout.period, settings.commissionBps, now);

  return {
    commissionBps: settings.commissionBps,
    payoutDay: settings.payoutDay,
    clabe: org.clabe,
    clabeHolder: org.clabeHolder,
    bankCode: org.bankCode,
    months: months.map((m) => ({ year: m.year, month: m.month, grossCents: m.grossCents, platformCents: m.platformCents, hostCents: m.hostCents, pilotValueCents: m.pilotValueCents })),
    current: { grossCents: current.grossCents, platformCents: current.platformCents, hostCents: current.hostCents, pilotValueCents: current.pilotValueCents },
    byScreen: own
      .map((s) => ({ screenId: s.id, name: s.name, ...(current.byScreen.get(s.id) ?? { grossCents: 0, hostCents: 0 }) }))
      .sort((a, b) => b.grossCents - a.grossCents),
    payout: {
      payDate: payout.payDate,
      closed: payout.closed,
      year: payout.period.year,
      month: payout.period.month,
      hostCents: payoutRevenue.hostCents,
    },
  };
}
