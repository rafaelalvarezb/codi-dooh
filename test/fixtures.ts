import { getDb } from "@/lib/db";
import { creatives, organizations, screens, sites } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import type { OrgCtx } from "@/lib/data/context";

export async function makeOrg(kind: OrgCtx["kind"], name = `Org ${kind}`): Promise<OrgCtx> {
  const db = await getDb();
  const id = newId("org");
  await db.insert(organizations).values({ id, name, kind });
  return { orgId: id, kind };
}

export async function makeScreen(host: OrgCtx, opts: { tokenVersion?: number; acceptsAds?: boolean } = {}) {
  const db = await getDb();
  const siteId = newId("sit");
  await db.insert(sites).values({ id: siteId, orgId: host.orgId, name: "Estacionamiento", kind: "parking" });
  const id = newId("scr");
  await db.insert(screens).values({
    id,
    siteId,
    orgId: host.orgId,
    name: "Caseta",
    profile: "parking",
    tokenVersion: opts.tokenVersion ?? 1,
    acceptsAds: opts.acceptsAds ?? true,
  });
  return id;
}

export async function makeCreative(org: OrgCtx, opts: { durationMs?: number; status?: "active" | "paused" } = {}) {
  const db = await getDb();
  const id = newId("crv");
  await db.insert(creatives).values({
    id,
    orgId: org.orgId,
    label: "Spot",
    blobUrl: "/ads/spot-01.mp4",
    durationMs: opts.durationMs ?? 6000,
    width: 1280,
    height: 720,
    codec: "avc1.64001f",
    sizeBytes: 1000,
    status: opts.status ?? "active",
  });
  return id;
}

export const DAY = 86_400_000;
