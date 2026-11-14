"use client";

import { useEffect, useRef, useState } from "react";
import { AD_PLAYLIST } from "@/lib/ads";
import type { BillingMode } from "@/lib/kiosk-profile";

interface DoohPlayerProps {
  billingMode: BillingMode;
  /** Dynamic profiles: true when ticket/amount signal arrives. Fixed (baño): always true. */
  sessionActive: boolean;
}

/**
 * Real video DOOH surface.
 * - Baño (fixed): muted loop while the pay panel is always visible.
 * - Parking/lavandería (dynamic): idle is quiet; on ticket signal, play the next spot.
 */
export function DoohPlayer({ billingMode, sessionActive }: DoohPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const [hasSource, setHasSource] = useState(true);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const available = AD_PLAYLIST.filter((ad) => !failedIds.has(ad.id));
  const creative = available[index % Math.max(available.length, 1)];
  const shouldPlay =
    billingMode === "fixed" || sessionActive;

  useEffect(() => {
    setIndex(0);
  }, [billingMode]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !creative || !hasSource) return;

    el.muted = true;
    el.playsInline = true;

    if (shouldPlay) {
      const play = async () => {
        try {
          await el.play();
        } catch {
          /* autoplay policies — muted should usually work */
        }
      };
      void play();
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [shouldPlay, creative?.id, hasSource]);

  function handleEnded() {
    if (available.length === 0) return;
    setIndex((current) => (current + 1) % available.length);
  }

  function handleError() {
    if (!creative) return;
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(creative.id);
      return next;
    });
  }

  useEffect(() => {
    setHasSource(available.length > 0);
  }, [available.length]);

  return (
    <section
      className="dooh-player relative h-full min-h-0 overflow-hidden bg-black"
      style={{ color: "#FFFFFF" }}
    >
      {creative && hasSource ? (
        <video
          key={creative.id}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={creative.src}
          muted
          playsInline
          loop={billingMode === "fixed" && available.length === 1}
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
            Agrega videos en <span className="font-mono text-zinc-100">public/ads/</span>
          </p>
          <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-zinc-500">
            Recomendado: 2–3 MP4 de 6 s (o uno de 15 s). Sin badge de slots.
          </p>
        </div>
      )}

      {/* Soft veil only so CoDi panel stays readable — video remains the hero */}
      <div
        className={[
          "pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/40 transition-opacity duration-500",
          shouldPlay ? "opacity-100" : "opacity-70",
        ].join(" ")}
      />
    </section>
  );
}
