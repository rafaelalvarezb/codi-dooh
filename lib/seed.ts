/**
 * Demo data for the pitch, all flagged isDemo. Idempotent (fixed ids).
 * No True Religion here: that account is created live through sign-up.
 *
 * Demo orgs have no known password unless DEMO_USER_PASSWORD is set; the
 * platform admin can "operate as" them from /admin.
 */
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  campaignScreens,
  campaigns,
  creatives,
  memberships,
  organizations,
  screens,
  sites,
  users,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { getSettings } from "@/lib/settings";

export const DEMO = {
  hostOrg: "org_demohost01",
  hostUser: "usr_demohost01",
  hostEmail: "host@demo.codidooh.mx",
  site: "sit_demoplaza01",
  screens: [
    { id: "scr_demo_salida_a", name: "Caseta de salida A" },
    { id: "scr_demo_salida_b", name: "Caseta de salida B" },
    { id: "scr_demo_cajero_n2", name: "Cajero automático · Nivel 2" },
  ],
  brandOrg: "org_demosilvertag",
  brandUser: "usr_demosilvertag",
  brandEmail: "silvertag@demo.codidooh.mx",
  creative: "crv_demosilvertag01",
  campaign: "cmp_demosilvertag01",
} as const;

const DAY = 86_400_000;

export async function seedDemo(now = new Date()) {
  const db = await getDb();
  const { defaultSpotPriceCents } = await getSettings();
  const password = process.env.DEMO_USER_PASSWORD || randomBytes(24).toString("base64url");
  const passwordHash = await hashPassword(password);

  await db
    .insert(organizations)
    .values([
      {
        id: DEMO.hostOrg,
        name: "Estacionamiento Plaza Centro",
        kind: "host",
        legalName: "Operadora Plaza Centro SA de CV",
        // Valid demo CLABE (BBVA, check digit OK).
        clabe: "012180001234567899",
        clabeHolder: "Operadora Plaza Centro SA de CV",
        bankCode: "012",
        isDemo: true,
      },
      { id: DEMO.brandOrg, name: "Silvertag", kind: "advertiser", isDemo: true },
    ])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      { id: DEMO.hostUser, email: DEMO.hostEmail, name: "Host demo", passwordHash },
      { id: DEMO.brandUser, email: DEMO.brandEmail, name: "Silvertag demo", passwordHash },
    ])
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values([
      { userId: DEMO.hostUser, orgId: DEMO.hostOrg, role: "owner" },
      { userId: DEMO.brandUser, orgId: DEMO.brandOrg, role: "owner" },
    ])
    .onConflictDoNothing();

  await db
    .insert(sites)
    .values({
      id: DEMO.site,
      orgId: DEMO.hostOrg,
      name: "Plaza Centro · Estacionamiento",
      address: "Av. Insurgentes Sur 1235, Benito Juárez, CDMX",
      kind: "parking",
      isDemo: true,
    })
    .onConflictDoNothing();

  await db
    .insert(screens)
    .values(
      DEMO.screens.map((s) => ({
        id: s.id,
        siteId: DEMO.site,
        orgId: DEMO.hostOrg,
        name: s.name,
        location: "Plaza Centro · Estacionamiento",
        profile: "parking" as const,
        tokenVersion: 1,
        tokenRotatedAt: now,
        acceptsAds: true,
        isDemo: true,
      })),
    )
    .onConflictDoNothing();

  // Placeholder creative from public/ads (1280×720, 6 s, H.264) until the
  // real Silvertag spot is uploaded through the platform.
  await db
    .insert(creatives)
    .values({
      id: DEMO.creative,
      orgId: DEMO.brandOrg,
      label: "Silvertag · spot provisional",
      blobUrl: "/ads/spot-05.mp4",
      posterUrl: null,
      durationMs: 6000,
      width: 1280,
      height: 720,
      codec: "avc1.64001f",
      sizeBytes: 2_949_825,
      fitMode: "cover",
      status: "active",
      isDemo: true,
    })
    .onConflictDoNothing();

  await db
    .insert(campaigns)
    .values({
      id: DEMO.campaign,
      orgId: DEMO.brandOrg,
      name: "Silvertag · Piloto Plaza Centro",
      creativeId: DEMO.creative,
      startsAt: new Date(now.getTime() - 14 * DAY),
      endsAt: new Date(now.getTime() + 45 * DAY),
      billing: "pilot",
      status: "active",
      spotPriceCents: defaultSpotPriceCents,
      isDemo: true,
    })
    .onConflictDoNothing();

  await db
    .insert(campaignScreens)
    .values(DEMO.screens.map((s) => ({ campaignId: DEMO.campaign, screenId: s.id, spots: 2 })))
    .onConflictDoNothing();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(screens)
    .where(sql`${screens.isDemo} = true`);
  return { screens: count };
}
