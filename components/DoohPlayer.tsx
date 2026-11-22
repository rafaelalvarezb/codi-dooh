"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AD_PLAYLIST } from "@/lib/ads";
import type { BillingMode } from "@/lib/kiosk-profile";
import { CreativeSurface } from "@/components/dooh/CreativeSurface";

interface DoohPlayerProps {
  billingMode: BillingMode;
  sessionActive: boolean;
  /** Linked screen (from ?screen=). Without it the local playlist loops as before. */
  screenId?: string | null;
  /** Kiosk secret (from ?token=) used to sign proof of play. */
  token?: string | null;
}

type Item = {
  key: string;
  creativeId: string | null;
  campaignId: string | null;
  src: string;
  poster: string | null;
};

type RemotePlaylist = {
  items: Array<{
    creativeId: string;
    campaignId: string;
    src: string;
    poster: string | null;
  }>;
  sequence: string[];
};

type PlayReport = { creativeId: string; campaignId: string; startedAt: number; endedAt: number };

const REFRESH_MS = 60_000;
const FLUSH_MS = 30_000;
const MAX_QUEUE = 500;

const LOCAL_ITEMS: Item[] = AD_PLAYLIST.map((ad) => ({
  key: ad.id,
  creativeId: null,
  campaignId: null,
  src: ad.src,
  poster: null,
}));

function toItems(pl: RemotePlaylist): Item[] {
  const byCampaign = new Map(pl.items.map((i) => [i.campaignId, i]));
  return pl.sequence
    .map((id) => byCampaign.get(id))
    .filter((i): i is RemotePlaylist["items"][number] => Boolean(i))
    .map((i) => ({ key: i.campaignId, creativeId: i.creativeId, campaignId: i.campaignId, src: i.src, poster: i.poster}));
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: playback must not care */
  }
}

/**
 * DOOH surface — full creative visible (object-contain, black bars OK) so
 * logos and text are never cropped. With a linked screen it pulls the live
 * playlist every 60 s and reports each play. It never goes dark: on network
 * errors it keeps the last good playlist (also cached in localStorage), then
 * the bundled ads. Playlist always runs so ads monetize idle + checkout time.
 */
export function DoohPlayer({ screenId, token }: DoohPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [remote, setRemote] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const startedAtRef = useRef<number | null>(null);

  const playlistKey = screenId ? `codidooh:playlist:${screenId}` : null;
  const queueKey = screenId ? `codidooh:plays:${screenId}` : null;

  // ── Live playlist ────────────────────────────────────────────────
  useEffect(() => {
    if (!screenId || !playlistKey) return;
    let cancelled = false;
    const cached = readStorage<RemotePlaylist>(playlistKey);
    const load = async () => {
      try {
        const res = await fetch(`/api/dooh/playlist?screen=${encodeURIComponent(screenId)}`);
        if (!res.ok) throw new Error(String(res.status));
        const pl = (await res.json()) as RemotePlaylist;
        if (cancelled) return;
        writeStorage(playlistKey, pl);
        setRemote(toItems(pl));
      } catch {
        // Offline or API down: keep what's playing; first load uses the cache.
        if (!cancelled) setRemote((current) => current ?? (cached ? toItems(cached) : null));
      }
    };
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [screenId, playlistKey]);

  // ── Proof of play queue ──────────────────────────────────────────
  const flush = useCallback(
    (useBeacon: boolean) => {
      if (!screenId || !token || !queueKey) return;
      const queue = readStorage<PlayReport[]>(queueKey) ?? [];
      if (queue.length === 0) return;
      const batch = queue.slice(0, 200);
      const body = JSON.stringify({ screenId, token, plays: batch });
      const drop = () => {
        const rest = (readStorage<PlayReport[]>(queueKey) ?? []).filter(
          (p) => !batch.some((b) => b.startedAt === p.startedAt && b.campaignId === p.campaignId),
        );
        writeStorage(queueKey, rest);
      };
      if (useBeacon && typeof navigator.sendBeacon === "function") {
        // Server dedupes by (screen, start), so an optimistic drop is safe.
        if (navigator.sendBeacon("/api/dooh/plays", body)) drop();
        return;
      }
      void fetch("/api/dooh/plays", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body,
        keepalive: true,
      })
        .then((res) => {
          // 401 = token rotated: those reports can never be accepted.
          if (res.ok || res.status === 401 || res.status === 400) drop();
        })
        .catch(() => undefined);
    },
    [screenId, token, queueKey],
  );

  useEffect(() => {
    if (!screenId || !token) return;
    const id = window.setInterval(() => flush(false), FLUSH_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [screenId, token, flush]);

  // ── Playback ─────────────────────────────────────────────────────
  // `latest` is what we'd like to play; `playing` only switches to it when the
  // current video ends, so a playlist refresh never cuts a spot mid-play.
  const latest = useMemo(() => {
    const source = remote && remote.length > 0 ? remote : LOCAL_ITEMS;
    return source.filter((i) => !failed.has(i.src));
  }, [remote, failed]);
  const latestRef = useRef(latest);
  useEffect(() => {
    latestRef.current = latest;
  }, [latest]);

  const [playing, setPlaying] = useState<{ list: Item[]; cursor: number; round: number }>({
    list: LOCAL_ITEMS,
    cursor: 0,
    round: 0,
  });
  // Nothing playable yet but something arrived: start right away (render-time sync).
  if (playing.list.length === 0 && latest.length > 0) {
    setPlaying({ list: latest, cursor: 0, round: playing.round + 1 });
  }

  const creative = playing.list.length ? playing.list[playing.cursor % playing.list.length] : undefined;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !creative) return;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    void el.play().catch(() => undefined);
  }, [creative?.key, playing.round, creative]);

  function advance(skipSrc?: string) {
    const next = latestRef.current.filter((i) => i.src !== skipSrc);
    setPlaying((prev) => {
      const sameList = next.length === prev.list.length && next.every((i, n) => i.key === prev.list[n]?.key);
      const cursor = sameList ? (prev.cursor + 1) % Math.max(1, next.length) : 0;
      return { list: next, cursor, round: prev.round + 1 };
    });
  }

  function handlePlaying() {
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
  }

  function handleEnded() {
    const startedAt = startedAtRef.current;
    startedAtRef.current = null;
    if (creative?.creativeId && creative.campaignId && startedAt && queueKey && token) {
      const queue = readStorage<PlayReport[]>(queueKey) ?? [];
      queue.push({ creativeId: creative.creativeId, campaignId: creative.campaignId, startedAt, endedAt: Date.now() });
      writeStorage(queueKey, queue.slice(-MAX_QUEUE));
    }
    advance();
  }

  function handleError() {
    startedAtRef.current = null;
    if (!creative) return;
    setFailed((prev) => new Set(prev).add(creative.src));
    advance(creative.src);
  }

  return (
    <section className="dooh-player relative h-full min-h-0 overflow-hidden bg-black">
      {creative ? (
        <CreativeSurface
          key={`${creative.key}:${playing.round}`}
          videoRef={videoRef}
          src={creative.src}
          poster={creative.poster}
          onEnded={handleEnded}
          onError={handleError}
          onPlaying={handlePlaying}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-8 text-center">
          <p className="font-mono text-[13px] tracking-[0.08em] text-zinc-500">
            ANUNCIO PROGRAMÁTICO · DV360
          </p>
          <p className="mt-3 max-w-md text-[18px] font-medium text-zinc-200">
            Sin creatividades locales — el hueco se llena con programática
          </p>
        </div>
      )}
    </section>
  );
}
