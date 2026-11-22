"use client";

import type { Ref } from "react";

/**
 * Renders a creative inside the DOOH column. Shared by the kiosk player and
 * the advertiser preview so what they see is exactly what plays.
 * Always the whole creative (`object-contain`) on black: logos and text are
 * never cropped; bars are fine when the aspect ratio doesn't fill
 * (design/SPEC.md).
 */
export function CreativeSurface({
  src,
  poster,
  videoRef,
  loop = false,
  onEnded,
  onError,
  onPlaying,
}: {
  src: string;
  poster?: string | null;
  videoRef?: Ref<HTMLVideoElement>;
  loop?: boolean;
  onEnded?: () => void;
  onError?: () => void;
  onPlaying?: () => void;
}) {
  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full bg-black object-contain"
      src={src}
      poster={poster ?? undefined}
      muted
      playsInline
      autoPlay
      loop={loop}
      preload="auto"
      onEnded={onEnded}
      onError={onError}
      onPlaying={onPlaying}
    />
  );
}
