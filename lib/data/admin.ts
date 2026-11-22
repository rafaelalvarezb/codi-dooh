/**
 * Platform admin data. NOT org-scoped: call only after requireViewer("admin")
 * or apiViewer("admin").
 */
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, creatives, memberships, organizations, screens, users } from "@/lib/db/schema";
import { campaignMarketValueCents } from "@/lib/pricing";
import { periodRevenue, recentMonths } from "@/lib/revenue";
import { getSettings } from "@/lib/settings";
import { campaignState } from "./campaigns";
import { NotFoundError, ValidationError } from "./context";
import { bookingsOnScreens } from "./host";

// ---------------------------------------------------------------------------
// Creatives (moderation)
// ---------------------------------------------------------------------------

export type AdminCreative = Awaited<ReturnType<typeof listAllCreatives>>[number];

export async function listAllCreatives(opts: { includeDemo?: boolean } = {}) {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select({
      creative: creatives,
      orgName: organizations.name,
      liveCampaigns: sql<number>`(
        select count(*) from ${campaigns}
        where ${campaigns.creativeId} = ${creatives.id}
          and ${campaigns.status} = 'active'
          and ${campaigns.startsAt} <= ${now}
          and ${campaigns.endsAt} > ${now}
      )`.mapWith(Number),
    })
    .from(creatives)
    .innerJoin(organizations, eq(organizations.id, creatives.orgId))
    .where(opts.includeDemo === false ? eq(creatives.isDemo, false) : undefined)
    .orderBy(desc(creatives.createdAt));
  return rows.map((r) => ({ ...r.creative, orgName: r.orgName, liveCampaigns: r.liveCampaigns }));
}

/** Pausing or rejecting removes the video from every kiosk on its next playlist refresh. */
export async function setCreativeStatus(id: string, status: "active" | "paused" | "rejected", note?: string | null) {
  const db = await getDb();
  const [row] = await db
    .update(creatives)
    .set({ status, moderationNote: status === "active" ? null : (note?.trim() || null) })
    .where(eq(creatives.id, id))
    .returning({ id: creatives.id });
  if (!row) throw new NotFoundError("Creativo");
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function listAllCampaigns(now = new Date()) {
  const db = await getDb();
  const rows = await db
    .select({
      campaign: campaigns,
      orgName: organizations.name,
      creativeStatus: creatives.status,
      creativeLabel: creatives.label,
      posterUrl: creatives.posterUrl,
      blobUrl: creatives.blobUrl,
    })
    .from(campaigns)
    .innerJoin(organizations, eq(organizations.id, campaigns.orgId))
    .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
    .orderBy(desc(campaigns.createdAt));
  const ids = rows.map((r) => r.campaign.id);
  const targets = ids.length
    ? await db
        .select({ campaignId: campaignScreens.campaignId, spots: campaignScreens.spots })
        .from(campaignScreens)
        .where(inArray(campaignScreens.campaignId, ids))
    : [];
  const byCampaign = new Map<string, Array<{ spots: number }>>();
  for (const t of targets) byCampaign.set(t.campaignId, [...(byCampaign.get(t.campaignId) ?? []), { spots: t.spots }]);
  return rows.map((r) => {
    const screensOf = byCampaign.get(r.campaign.id) ?? [];
    return {
      ...r.campaign,
      orgName: r.orgName,
      creativeLabel: r.creativeLabel,
      posterUrl: r.posterUrl,
      blobUrl: r.blobUrl,
      screenCount: screensOf.length,
      state: campaignState(r.campaign, r.creativeStatus, now),
      marketValueCents: campaignMarketValueCents({
        spotPriceCents: r.campaign.spotPriceCents,
        screens: screensOf,
        startsAt: r.campaign.startsAt,
        endsAt: r.campaign.endsAt,
      }),
    };
  });
}

/** Paid ↔ pilot (house ads stay house: they belong to the host). */
export async function setCampaignBilling(id: string, billing: "paid" | "pilot") {
  const db = await getDb();
  const [current] = await db.select({ billing: campaigns.billing }).from(campaigns).where(eq(campaigns.id, id));
  if (!current) throw new NotFoundError("Campaña");
  if (current.billing === "house") throw new ValidationError("Los anuncios propios de un host no se cobran.");
  await db.update(campaigns).set({ billing }).where(eq(campaigns.id, id));
}

export async function setCampaignStatusAsAdmin(id: string, status: "active" | "paused") {
  const db = await getDb();
  const [row] = await db.update(campaigns).set({ status }).where(eq(campaigns.id, id)).returning({ id: campaigns.id });
  if (!row) throw new NotFoundError("Campaña");
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function listOrgs() {
  const db = await getDb();
  // Explicit aliases: on single-table selects Drizzle renders columns unqualified,
  // which would be ambiguous inside these correlated subqueries.
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      kind: organizations.kind,
      isDemo: organizations.isDemo,
      clabe: organizations.clabe,
      createdAt: organizations.createdAt,
      members: sql<number>`(select count(*) from memberships m where m.org_id = "organizations"."id")`.mapWith(Number),
      screens: sql<number>`(select count(*) from screens s where s.org_id = "organizations"."id")`.mapWith(Number),
      campaigns: sql<number>`(select count(*) from campaigns c where c.org_id = "organizations"."id")`.mapWith(Number),
      ownerEmail: sql<string | null>`(
        select u.email from memberships m join users u on u.id = m.user_id
        where m.org_id = "organizations"."id" order by m.created_at limit 1
      )`,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));
}

/**
 * Deletes an organization and everything it owns (sites, screens, creatives,
 * campaigns and their plays). Users left without any organization are
 * deleted too, unless they are platform admins. Requires the exact name.
 */
export async function deleteOrg(id: string, confirmName: string) {
  const db = await getDb();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  if (!org) throw new NotFoundError("Organización");
  if (org.name.trim() !== confirmName.trim()) throw new ValidationError("El nombre no coincide.");

  await db.transaction(async (tx) => {
    const members = await tx.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.orgId, id));
    // Campaigns first: creatives are protected while a campaign uses them.
    await tx.delete(campaigns).where(eq(campaigns.orgId, id));
    await tx.delete(organizations).where(eq(organizations.id, id));
    const userIds = members.map((m) => m.userId);
    if (userIds.length) {
      await tx.delete(users).where(
        and(
          inArray(users.id, userIds),
          eq(users.isPlatformAdmin, false),
          sql`not exists (select 1 from ${memberships} where ${memberships.userId} = ${users.id})`,
        ),
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export async function platformRevenue(now = new Date()) {
  const db = await getDb();
  const hostScreens = await db.select({ id: screens.id }).from(screens).where(isNotNull(screens.orgId));
  const [bookings, settings] = await Promise.all([bookingsOnScreens(hostScreens.map((s) => s.id)), getSettings()]);
  const months = recentMonths(now, 3).map((m) => ({ year: m.year, month: m.month, ...periodRevenue(bookings, m, settings.commissionBps, now) }));
  const current = months[months.length - 1];
  return {
    commissionBps: settings.commissionBps,
    current: {
      grossCents: current.grossCents,
      platformCents: current.platformCents,
      hostCents: current.hostCents,
      pilotValueCents: current.pilotValueCents,
    },
    months: months.map((m) => ({ year: m.year, month: m.month, grossCents: m.grossCents, platformCents: m.platformCents, hostCents: m.hostCents, pilotValueCents: m.pilotValueCents })),
  };
}
