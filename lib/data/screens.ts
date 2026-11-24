/** Screens visible to advertisers (marketplace) and to their host. */
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, screens, sites } from "@/lib/db/schema";
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
};

async function selectScreens(where: ReturnType<typeof and>) {
  const db = await getDb();
  const { defaultSpotPriceCents } = await getSettings();
  const rows = await db
    .select({
      id: screens.id,
      name: screens.name,
      spotPriceCents: screens.spotPriceCents,
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
