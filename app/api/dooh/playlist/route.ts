import { after, NextResponse } from "next/server";
import { touchMachine } from "@/lib/machines";
import { getPlaylist } from "@/lib/data/playlist";

/**
 * GET /api/dooh/playlist?screen=<id>
 * Creatives a kiosk should rotate right now, with a weighted sequence.
 * Short CDN cache: a new or paused campaign shows up within ~1 refresh.
 */
export async function GET(request: Request) {
  const screen = new URL(request.url).searchParams.get("screen") ?? "";
  if (!/^[a-z0-9_-]{1,64}$/i.test(screen)) {
    return NextResponse.json({ error: "screen inválido" }, { status: 400 });
  }
  try {
    const playlist = await getPlaylist(screen);
    if (!playlist) return NextResponse.json({ error: "Pantalla no encontrada" }, { status: 404 });
    after(() => touchMachine(screen).catch(() => undefined));
    return NextResponse.json(playlist, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch (error) {
    console.error("[dooh/playlist]", error);
    return NextResponse.json({ error: "No disponible" }, { status: 503 });
  }
}
