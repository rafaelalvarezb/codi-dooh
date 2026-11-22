/** Campaigns, always scoped to the caller's org. */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, creatives, plays, screens } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { canAdvertise, canHost } from "@/lib/auth/roles";
import { campaignMarketValueCents, type BillingKind } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { NotFoundError, ValidationError, type OrgCtx } from "./context";

export const MAX_CAMPAIGN_DAYS = 366;
export const MAX_SPOTS_PER_SCREEN = 10;

export type CampaignInput = {
  name: string;
  creativeId: string;
  screens: Array<{ screenId: string; spots: number }>;
  startsAt: Date;
  endsAt: Date;
  /** "house" = host advertising on its own screens. */
  mode: "advertiser" | "house";
};

/** Creates and publishes (status active) a campaign. Validates ownership of everything. */
export async function createCampaign(ctx: OrgCtx, input: CampaignInput) {
  if (input.mode === "advertiser" && !canAdvertise(ctx.kind)) {
    throw new ValidationError("Tu cuenta no puede crear campañas de anunciante.");
  }
  if (input.mode === "house" && !canHost(ctx.kind)) {
    throw new ValidationError("Solo un host puede anunciarse en sus propias pantallas.");
  }
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new ValidationError("La fecha de fin debe ser posterior al inicio.");
  }
  if (input.endsAt.getTime() - input.startsAt.getTime() > MAX_CAMPAIGN_DAYS * 86_400_000) {
    throw new ValidationError("La campaña puede durar hasta un año.");
  }
  const unique = new Map(input.screens.map((s) => [s.screenId, s]));
  if (unique.size === 0) throw new ValidationError("Elige al menos una pantalla.");

  const db = await getDb();
  const [creative] = await db
    .select()
    .from(creatives)
    .where(and(eq(creatives.id, input.creativeId), eq(creatives.orgId, ctx.orgId)));
  if (!creative) throw new NotFoundError("Creativo");
  if (creative.status !== "active") throw new ValidationError("Este creativo está pausado o rechazado.");

  const screenRows = await db
    .select({ id: screens.id, orgId: screens.orgId, acceptsAds: screens.acceptsAds })
    .from(screens)
    .where(inArray(screens.id, [...unique.keys()]));
  if (screenRows.length !== unique.size) throw new ValidationError("Una de las pantallas no existe.");
  for (const s of screenRows) {
    if (!s.orgId) throw new ValidationError("Una de las pantallas no está disponible.");
    if (input.mode === "house" && s.orgId !== ctx.orgId) {
      throw new ValidationError("Solo puedes usar tus propias pantallas.");
    }
    if (input.mode === "advertiser" && !s.acceptsAds) {
      throw new ValidationError("Una de las pantallas no acepta anuncios.");
    }
  }

  const billing: BillingKind = input.mode === "house" ? "house" : "paid";
  const { defaultSpotPriceCents } = await getSettings();
  const id = newId("cmp");

  await db.transaction(async (tx) => {
    await tx.insert(campaigns).values({
      id,
      orgId: ctx.orgId,
      name: input.name,
      creativeId: creative.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      billing,
      status: "active",
      spotPriceCents: billing === "house" ? 0 : defaultSpotPriceCents,
    });
    await tx.insert(campaignScreens).values(
      [...unique.values()].map((s) => ({
        campaignId: id,
        screenId: s.screenId,
        spots: Math.min(MAX_SPOTS_PER_SCREEN, Math.max(1, Math.floor(s.spots))),
      })),
    );
  });
  return getCampaign(ctx, id);
}

export async function getCampaign(ctx: OrgCtx, id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ campaign: campaigns, creative: creatives })
    .from(campaigns)
    .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
    .where(and(eq(campaigns.id, id), eq(campaigns.orgId, ctx.orgId)));
  if (!row) throw new NotFoundError("Campaña");
  const targets = await db
    .select({ screenId: campaignScreens.screenId, spots: campaignScreens.spots, name: screens.name })
    .from(campaignScreens)
    .innerJoin(screens, eq(screens.id, campaignScreens.screenId))
    .where(eq(campaignScreens.campaignId, id));
  return {
    ...row.campaign,
    creative: row.creative,
    screens: targets,
    marketValueCents: campaignMarketValueCents({
      spotPriceCents: row.campaign.spotPriceCents,
      screens: targets,
      startsAt: row.campaign.startsAt,
      endsAt: row.campaign.endsAt,
    }),
  };
}

export type CampaignSummary = Awaited<ReturnType<typeof listCampaigns>>[number];

export async function listCampaigns(ctx: OrgCtx, opts?: { mode?: "advertiser" | "house" }) {
  const db = await getDb();
  const filters = [eq(campaigns.orgId, ctx.orgId)];
  if (opts?.mode === "house") filters.push(eq(campaigns.billing, "house"));
  if (opts?.mode === "advertiser") filters.push(sql`${campaigns.billing} <> 'house'`);
  const rows = await db
    .select({
      campaign: campaigns,
      creative: {
        id: creatives.id,
        label: creatives.label,
        posterUrl: creatives.posterUrl,
        blobUrl: creatives.blobUrl,
        status: creatives.status,
        durationMs: creatives.durationMs,
      },
      screenCount: sql<number>`(select count(*) from ${campaignScreens} where ${campaignScreens.campaignId} = ${campaigns.id})`.mapWith(Number),
      playCount: sql<number>`(select count(*) from ${plays} where ${plays.campaignId} = ${campaigns.id})`.mapWith(Number),
    })
    .from(campaigns)
    .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
    .where(and(...filters))
    .orderBy(desc(campaigns.createdAt));
  return rows.map((r) => ({ ...r.campaign, creative: r.creative, screenCount: r.screenCount, playCount: r.playCount }));
}

export async function setCampaignStatus(ctx: OrgCtx, id: string, status: "active" | "paused") {
  const db = await getDb();
  const [row] = await db
    .update(campaigns)
    .set({ status })
    .where(and(eq(campaigns.id, id), eq(campaigns.orgId, ctx.orgId)))
    .returning({ id: campaigns.id });
  if (!row) throw new NotFoundError("Campaña");
}

/** Display state that also considers dates and creative moderation. */
export function campaignState(
  c: { status: string; startsAt: Date; endsAt: Date },
  creativeStatus: string,
  now = new Date(),
): "active" | "scheduled" | "ended" | "paused" | "blocked" {
  if (creativeStatus !== "active") return "blocked";
  if (c.status === "paused" || c.status === "draft") return "paused";
  if (now >= c.endsAt || c.status === "ended") return "ended";
  if (now < c.startsAt) return "scheduled";
  return "active";
}
