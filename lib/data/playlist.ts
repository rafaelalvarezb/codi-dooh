/** What a kiosk should play right now, and its proof-of-play reports. */
import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { campaignScreens, campaigns, creatives, plays, screens } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { buildSequence } from "@/lib/rotation";
import { verifyScreenToken } from "@/lib/screen-token";

export type PlaylistItem = {
  creativeId: string;
  campaignId: string;
  src: string;
  poster: string | null;
  durationMs: number;
  fitMode: "cover" | "blur";
  label: string;
  weight: number;
};

export type Playlist = {
  screenId: string;
  generatedAt: string;
  items: PlaylistItem[];
  /** One rotation cycle of item keys (`campaignId`), weighted by spots. */
  sequence: string[];
};

/** Active (in dates, not paused, creative active) campaigns targeting this screen. */
export async function getPlaylist(screenId: string, now = new Date()): Promise<Playlist | null> {
  const db = await getDb();
  const [screen] = await db.select({ id: screens.id }).from(screens).where(eq(screens.id, screenId));
  if (!screen) return null;

  const rows = await db
    .select({
      campaignId: campaigns.id,
      creativeId: creatives.id,
      src: creatives.blobUrl,
      poster: creatives.posterUrl,
      durationMs: creatives.durationMs,
      fitMode: creatives.fitMode,
      label: creatives.label,
      weight: campaignScreens.spots,
    })
    .from(campaignScreens)
    .innerJoin(campaigns, eq(campaigns.id, campaignScreens.campaignId))
    .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
    .where(
      and(
        eq(campaignScreens.screenId, screenId),
        eq(campaigns.status, "active"),
        lte(campaigns.startsAt, now),
        gt(campaigns.endsAt, now),
        eq(creatives.status, "active"),
      ),
    );

  const items: PlaylistItem[] = rows.map((r) => ({ ...r }));
  return {
    screenId,
    generatedAt: now.toISOString(),
    items,
    sequence: buildSequence(items.map((i) => ({ id: i.campaignId, weight: i.weight }))),
  };
}

export type PlayReport = { creativeId: string; campaignId: string; startedAt: number; endedAt: number };

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 2 * 60 * 1000;
const MIN_PLAY_MS = 1000;
const DURATION_SLACK_MS = 5000;

/**
 * Stores proof of play after checking the kiosk token. Drops impossible
 * reports: future, too old, longer than the creative, or for a campaign that
 * never targeted this screen. Duplicates (same screen + start) are ignored.
 */
export async function recordPlays(
  screenId: string,
  token: string,
  reports: PlayReport[],
  now = Date.now(),
): Promise<{ ok: false } | { ok: true; accepted: number }> {
  const db = await getDb();
  const [screen] = await db
    .select({ id: screens.id, tokenVersion: screens.tokenVersion })
    .from(screens)
    .where(eq(screens.id, screenId));
  if (!screen || !verifyScreenToken(screen.id, screen.tokenVersion, token)) return { ok: false };

  await db.update(screens).set({ lastSeenAt: new Date(now) }).where(eq(screens.id, screenId));
  if (reports.length === 0) return { ok: true, accepted: 0 };

  const targets = await db
    .select({ campaignId: campaignScreens.campaignId, creativeId: campaigns.creativeId, durationMs: creatives.durationMs })
    .from(campaignScreens)
    .innerJoin(campaigns, eq(campaigns.id, campaignScreens.campaignId))
    .innerJoin(creatives, eq(creatives.id, campaigns.creativeId))
    .where(eq(campaignScreens.screenId, screenId));
  const byCampaign = new Map(targets.map((t) => [t.campaignId, t]));

  const valid = reports.filter((r) => {
    const target = byCampaign.get(r.campaignId);
    if (!target || target.creativeId !== r.creativeId) return false;
    const length = r.endedAt - r.startedAt;
    if (length < MIN_PLAY_MS || length > target.durationMs + DURATION_SLACK_MS) return false;
    if (r.endedAt > now + CLOCK_SKEW_MS || r.startedAt < now - MAX_AGE_MS) return false;
    return true;
  });
  if (valid.length === 0) return { ok: true, accepted: 0 };

  const inserted = await db
    .insert(plays)
    .values(
      valid.map((r) => ({
        id: newId("ply"),
        screenId,
        creativeId: r.creativeId,
        campaignId: r.campaignId,
        startedAt: new Date(r.startedAt),
        endedAt: new Date(r.endedAt),
        // Kiosk-reported plays are real traffic, even on a demo screen.
        isDemo: false,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: plays.id });
  return { ok: true, accepted: inserted.length };
}
