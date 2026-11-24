/** Screens visible to advertisers (marketplace) and to their host. */
import { and, asc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, creatives, organizations, screens, sites } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import type { OrgCtx } from "./context";

export type ScreenOption = {
  id: string;
  name: string;
  siteName: string;
  siteAddress: string;
  siteKind: "parking" | "restroom" | "laundry" | "vending";
  hostOrgId: string;
  hostName: string;
  isDemo: boolean;
  spotPriceCents: number;
  /** Host's estimate of people paying per day (null = default). */
  dailyPayers: number | null;
};

async function selectScreens(where: ReturnType<typeof and>) {
  const db = await getDb();
  const { defaultSpotPriceCents } = await getSettings();
  const rows = await db
    .select({
      id: screens.id,
      name: screens.name,
      spotPriceCents: screens.spotPriceCents,
      dailyPayers: screens.dailyPayers,
      isDemo: screens.isDemo,
      siteName: sites.name,
      siteAddress: sites.address,
      siteKind: sites.kind,
      hostOrgId: organizations.id,
      hostName: organizations.name,
    })
    .from(screens)
    .innerJoin(sites, eq(sites.id, screens.siteId))
    .innerJoin(organizations, eq(organizations.id, screens.orgId))
    .where(where)
    .orderBy(asc(sites.name), asc(screens.name));
  return rows.map<ScreenOption>((r) => ({
    ...r,
    spotPriceCents: r.spotPriceCents ?? defaultSpotPriceCents,
  }));
}

/** Every host screen that accepts ads. */
export function listMarketplaceScreens(): Promise<ScreenOption[]> {
  return selectScreens(and(isNotNull(screens.orgId), eq(screens.acceptsAds, true)));
}

/** Screens owned by the caller's org (for house campaigns). */
export function listOwnScreens(ctx: OrgCtx): Promise<ScreenOption[]> {
  return selectScreens(and(eq(screens.orgId, ctx.orgId)));
}

/**
 * Spots already booked on each screen by live or upcoming campaigns with an
 * approved video: the other turns in the rotation a new booking would share.
 */
export async function bookedSpotsByScreen(screenIds: string[], now = new Date()): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (screenIds.length === 0) return out;
  const db = await getDb();
  const rows = await db
    .select({ screenId: campaignScreens.screenId, spots: sql<number>`sum(${campaignScreens.spots})`.mapWith(Number) })
    .from(campaignScreens)
    .innerJoin(campaigns, eq(campaigns.id, campaignScreens.campaignId))
    .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
    .where(
      and(
        inArray(campaignScreens.screenId, screenIds),
        eq(campaigns.status, "active"),
        gt(campaigns.endsAt, now),
        eq(creatives.status, "active"),
      ),
    )
    .groupBy(campaignScreens.screenId);
  for (const r of rows) out.set(r.screenId, r.spots);
  return out;
}
