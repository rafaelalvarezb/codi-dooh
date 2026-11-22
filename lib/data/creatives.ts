/** Creatives (uploaded videos), always scoped to the caller's org. */
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { creatives } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { moderateCreative } from "@/lib/moderation";
import { checkCreative, type VideoMeta } from "@/lib/video/rules";
import { NotFoundError, ValidationError, type OrgCtx } from "./context";

export type CreativeRow = typeof creatives.$inferSelect;

export async function createCreative(
  ctx: OrgCtx,
  input: { label: string; blobUrl: string; posterUrl: string | null; meta: VideoMeta },
): Promise<CreativeRow> {
  const check = checkCreative(input.meta);
  if (!check.ok) throw new ValidationError(check.errors.join(" "));
  const decision = await moderateCreative({ orgId: ctx.orgId, label: input.label, blobUrl: input.blobUrl });
  const db = await getDb();
  const [row] = await db
    .insert(creatives)
    .values({
      id: newId("crv"),
      orgId: ctx.orgId,
      label: input.label,
      blobUrl: input.blobUrl,
      posterUrl: input.posterUrl,
      durationMs: input.meta.durationMs,
      width: input.meta.width,
      height: input.meta.height,
      codec: input.meta.codec,
      sizeBytes: input.meta.sizeBytes,
      fitMode: check.fitMode,
      status: decision.status,
      moderationNote: decision.note ?? null,
    })
    .returning();
  return row;
}

export async function listCreatives(ctx: OrgCtx): Promise<CreativeRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(creatives)
    .where(eq(creatives.orgId, ctx.orgId))
    .orderBy(desc(creatives.createdAt));
}

export async function getCreative(ctx: OrgCtx, id: string): Promise<CreativeRow> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(creatives)
    .where(and(eq(creatives.id, id), eq(creatives.orgId, ctx.orgId)));
  if (!row) throw new NotFoundError("Creativo");
  return row;
}
