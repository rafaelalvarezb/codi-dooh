"use client";

import { useEffect, useRef, useState } from "react";
import { AD_PLAYLIST } from "@/lib/ads";
import type { BillingMode } from "@/lib/kiosk-profile";

interface DoohPlayerProps {
  billingMode: BillingMode;
  sessionActive: boolean;
}

/**
 * DOOH surface — full creative visible (object-contain).
 * Prefer contain over cover so bumper text/logos are not cropped.
 * Playlist always runs so ads monetize idle + checkout time.
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
