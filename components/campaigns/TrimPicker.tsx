"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const FRAMES = 10;

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Instagram-style cut: a fixed 15 s window over a strip of frames. You can
 * slide it, not resize it. The player above loops the chosen part.
 */
export function TrimPicker({
  src,
  durationMs,
  windowMs,
  startMs,
  onChange,
}: {
  src: string;
  durationMs: number;
  windowMs: number;
  startMs: number;
  onChange: (ms: number) => void;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef<number | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const maxStart = Math.max(0, durationMs - windowMs);
  const widthPct = Math.min(100, (windowMs / durationMs) * 100);
  const leftPct = durationMs > 0 ? (startMs / durationMs) * 100 : 0;

  // Thumbnails for the strip (best effort; the strip still works without them).
  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = src;
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 54;
    const ctx = canvas.getContext("2d");
    const seek = (t: number) =>
      new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = t;
      });
    (async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error("load"));
        });
        const out: string[] = [];
        for (let i = 0; i < FRAMES && !cancelled; i++) {
          await seek(((i + 0.5) * video.duration) / FRAMES);
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          out.push(canvas.toDataURL("image/jpeg", 0.6));
          if (!cancelled) setFrames([...out]);
        }
      } catch {
        /* no thumbnails */
      }
    })();
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  // Loop the chosen part in the player.
  useEffect(() => {
    const v = player.current;
    if (!v) return;
    v.currentTime = startMs / 1000;
    void v.play().catch(() => {});
  }, [startMs]);

  function onTimeUpdate() {
    const v = player.current;
    if (!v) return;
    const start = startMs / 1000;
    if (v.currentTime >= start + windowMs / 1000 || v.currentTime < start - 0.3) {
      v.currentTime = start;
      void v.play().catch(() => {});
    }
  }

  function msAt(clientX: number): number {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return startMs;
    return ((clientX - rect.left) / rect.width) * durationMs;
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const at = msAt(e.clientX);
    // Grabbing inside the window keeps the grip point; outside jumps there.
    const inside = at >= startMs && at <= startMs + windowMs;
    grab.current = inside ? at - startMs : windowMs / 2;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!inside) onChange(Math.round(Math.min(maxStart, Math.max(0, at - windowMs / 2))));
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (grab.current === null) return;
    const next = msAt(e.clientX) - grab.current;
    onChange(Math.round(Math.min(maxStart, Math.max(0, next))));
  }

  return (
    <div>
      <video
        ref={player}
        src={src}
        muted
        playsInline
        autoPlay
        onTimeUpdate={onTimeUpdate}
        className="aspect-video w-full rounded-[var(--cd-radius-md)] bg-black object-contain"
      />
      <p className="mt-4 text-[length:var(--cd-small)] font-medium">Elige qué 15 segundos se muestran</p>
      <p className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">
        Tu video dura {clock(durationMs)}. Arrastra el recuadro: se verá de {clock(startMs)} a {clock(startMs + windowMs)}.
      </p>
      <div
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (grab.current = null)}
        onPointerCancel={() => (grab.current = null)}
        className="relative mt-3 h-16 cursor-grab touch-none overflow-hidden rounded-[var(--cd-radius-sm)] bg-[var(--cd-night)] select-none active:cursor-grabbing"
      >
        <div className="flex h-full">
          {Array.from({ length: FRAMES }, (_, i) => (
            <div
              key={i}
              className="h-full flex-1 bg-cover bg-center"
              style={frames[i] ? { backgroundImage: `url(${frames[i]})` } : undefined}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/60" style={{ width: `${leftPct}%` }} />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-black/60"
          style={{ width: `${Math.max(0, 100 - leftPct - widthPct)}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 rounded-[var(--cd-radius-sm)] border-[3px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
      </div>
      <label className="sr-only">
        Inicio del tramo (segundos)
        <input
          type="range"
          min={0}
          max={maxStart}
          step={500}
          value={startMs}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
