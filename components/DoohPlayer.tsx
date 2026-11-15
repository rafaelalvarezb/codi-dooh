"use client";

import { useEffect, useRef, useState } from "react";
import { AD_PLAYLIST } from "@/lib/ads";
import type { BillingMode } from "@/lib/kiosk-profile";

interface DoohPlayerProps {
  billingMode: BillingMode;
  sessionActive: boolean;
}

/**
 * Real video DOOH surface.
 * - Baño (fixed): muted rotation while paying.
 * - Parking/lavandería (dynamic): quiet idle frame; on ticket/session, play 6s bumpers.
 */
export function DoohPlayer({ billingMode, sessionActive }: DoohPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const available = AD_PLAYLIST.filter((ad) => !failedIds.has(ad.id));
  const creative = available.length
    ? available[index % available.length]
    : undefined;
  const shouldPlay = billingMode === "fixed" || sessionActive;

  useEffect(() => {
    setIndex(0);
  }, [billingMode]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !creative) return;

    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;

    if (shouldPlay) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
      // Idle: hold a still frame (programmatic "static" feel between sessions)
      if (el.readyState >= 2) el.currentTime = 0.1;
    }
  }, [shouldPlay, creative?.id]);

  function handleEnded() {
    if (available.length <= 1) {
      const el = videoRef.current;
      if (el && billingMode === "fixed") {
        el.currentTime = 0;
        void el.play().catch(() => undefined);
      }
      return;
    }
    setIndex((current) => (current + 1) % available.length);
  }

  function handleError() {
    if (!creative) return;
    setFailedIds((prev) => new Set(prev).add(creative.id));
    setIndex((current) => current + 1);
  }

  return (
    <section className="dooh-player relative h-full min-h-0 overflow-hidden bg-black">
      {creative ? (
        <video
          key={creative.id}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={creative.src}
          muted
          playsInline
          preload="auto"
          onEnded={handleEnded}
          onError={handleError}
          onLoadedData={() => {
            if (!shouldPlay && videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0.1;
            }
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-8 text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-zinc-500">
            DOOH
          </p>
          <p className="mt-3 max-w-md text-[18px] font-medium text-zinc-200">
            No hay creatividades cargadas
          </p>
          <p className="mt-2 max-w-sm text-[14px] text-zinc-500">
            Coloca MP4 en <span className="font-mono">public/ads/</span>
          </p>
        </div>
      )}

      <div
        className={[
          "pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/35 transition-opacity duration-500",
          shouldPlay ? "opacity-100" : "opacity-80",
        ].join(" ")}
      />
    </section>
  );
}
