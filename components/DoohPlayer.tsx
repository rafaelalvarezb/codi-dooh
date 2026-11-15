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
 * Playlist always runs (bathroom, parking idle, laundry idle) — ads monetize
 * screen time even before a payment session starts.
 * Uses object-contain so 16:9 bumpers are not cropped on the sides.
 */
export function DoohPlayer(_props: DoohPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const available = AD_PLAYLIST.filter((ad) => !failedIds.has(ad.id));
  const creative = available.length
    ? available[index % available.length]
    : undefined;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !creative) return;

    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    void el.play().catch(() => undefined);
  }, [creative?.id]);

  function handleEnded() {
    if (available.length <= 1) {
      const el = videoRef.current;
      if (el) {
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
          className="absolute inset-0 h-full w-full object-contain bg-black"
          src={creative.src}
          muted
          playsInline
          preload="auto"
          onEnded={handleEnded}
          onError={handleError}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-8 text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-zinc-500">
            DOOH
          </p>
          <p className="mt-3 max-w-md text-[18px] font-medium text-zinc-200">
            No hay creatividades cargadas
          </p>
        </div>
      )}
    </section>
  );
}
