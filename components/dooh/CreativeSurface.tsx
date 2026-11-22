"use client";

import type { Ref } from "react";

export type FitMode = "cover" | "blur";

/**
 * Renders a creative inside the DOOH column. Shared by the kiosk player and
 * the advertiser preview so what they see is exactly what plays.
 *  - cover: full-bleed `object-cover` (landscape).
 *  - blur:  the whole video centered over a blurred still of itself (portrait),
 *           so vertical brand spots aren't cut in half. A still image (not a
 *           second video) keeps the Raspberry Pi to one decoder.
 */
export function CreativeSurface({
  src,
  poster,
  fitMode,
  videoRef,
  loop = false,
  onEnded,
  onError,
  onPlaying,
}: {
  src: string;
  poster?: string | null;
  fitMode: FitMode;
  videoRef?: Ref<HTMLVideoElement>;
  loop?: boolean;
  onEnded?: () => void;
  onError?: () => void;
  onPlaying?: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {fitMode === "blur" && poster ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative backdrop from Blob */}
          <img
            src={poster}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-3xl"
          />
          <div className="absolute inset-0 bg-black/35" aria-hidden />
        </>
      ) : null}
      <video
        ref={videoRef}
        className={[
          "absolute inset-0 h-full w-full",
          fitMode === "blur" ? "object-contain" : "object-cover bg-black",
        ].join(" ")}
        src={src}
        muted
        playsInline
        autoPlay
        loop={loop}
        preload="auto"
        onEnded={onEnded}
        onError={onError}
        onPlaying={onPlaying}
      />
    </div>
  );
}
