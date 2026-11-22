import { NextResponse } from "next/server";
import { z } from "zod";
import { recordPlays } from "@/lib/data/playlist";

const BodySchema = z.object({
  screenId: z.string().regex(/^[a-z0-9_-]{1,64}$/i),
  token: z.string().min(8).max(128),
  plays: z
    .array(
      z.object({
        creativeId: z.string().max(64),
        campaignId: z.string().max(64),
        startedAt: z.number().int().positive(),
        endedAt: z.number().int().positive(),
      }),
    )
    .max(200),
});

/**
 * POST /api/dooh/plays — proof of play from kiosks (navigator.sendBeacon,
 * so the body arrives as text/plain JSON). Authenticated by the screen's
 * kiosk token so nobody can inflate impressions.
 */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (raw.length > 64 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const result = await recordPlays(parsed.data.screenId, parsed.data.token, parsed.data.plays);
    if (!result.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ accepted: result.accepted });
  } catch (error) {
    console.error("[dooh/plays]", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
