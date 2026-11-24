/**
 * Creative rules, shared by the browser (instant feedback) and the server
 * (authoritative re-validation). Pure.
 */

/** Largest original we accept; the server converts it to a ~5–12 MB kiosk MP4. */
export const MAX_CREATIVE_BYTES = 250 * 1024 * 1024;
export const MAX_CREATIVE_MB = MAX_CREATIVE_BYTES / 1024 / 1024;
/** Spots run 5–15 s. Longer videos are accepted: the advertiser picks which 15 s. */
export const MIN_DURATION_SEC = 5;
export const MAX_DURATION_SEC = 15;
/** Images become a still spot of this length. */
export const IMAGE_DURATION_SEC = 15;
/** Longest original we'll cut a spot from. */
export const MAX_SOURCE_DURATION_SEC = 10 * 60;
export const DURATION_TOLERANCE_MS = 500;
export const MIN_SHORT_SIDE_PX = 480;

/**
 * DOOH column of the kiosk at its native 1280×800 frame:
 * (1280 − 2×16 padding) − 420 panel = 828 wide, 800 − 2×16 = 768 tall.
 * Source: components/KioskShell.tsx grid `minmax(0,1fr) 420px`.
 */
export const DOOH_COLUMN = { width: 828, height: 768 } as const;
export const KIOSK_FRAME = { width: 1280, height: 800, padding: 16, panel: 420 } as const;

/** Aspect difference under which a video counts as filling the column. */
export const FILL_TOLERANCE = 0.04;

/**
 * Where the black bars go. The kiosk always shows the whole creative
 * (`object-contain` on black) so logos and text are never cropped
 * (design/SPEC.md).
 */
export type Letterbox = "none" | "sides" | "topBottom";

export type VideoMeta = {
  codec: string;
  durationMs: number;
  width: number;
  height: number;
  sizeBytes: number;
};

export type CreativeCheck = {
  ok: boolean;
  errors: string[];
  letterbox: Letterbox;
  durationSec: number | null;
};

/** H.264 in MP4 (`avc1` / `avc3`), which the Raspberry Pi decodes in hardware. */
export function isH264(codec: string): boolean {
  return /^avc[13](\.|$)/i.test(codec.trim());
}

/** Black bars of a video shown whole (`object-contain`) in a box. */
export function letterboxFor(
  width: number,
  height: number,
  box: { width: number; height: number } = DOOH_COLUMN,
): Letterbox {
  if (width <= 0 || height <= 0) return "none";
  const ratio = width / height / (box.width / box.height);
  if (Math.abs(ratio - 1) <= FILL_TOLERANCE) return "none";
  return ratio > 1 ? "topBottom" : "sides";
}

/** Whole seconds when the length is accepted (5–30 s, ±0.5 s), else null. */
export function matchDuration(durationMs: number): number | null {
  if (!Number.isFinite(durationMs)) return null;
  const min = MIN_DURATION_SEC * 1000 - DURATION_TOLERANCE_MS;
  const max = MAX_DURATION_SEC * 1000 + DURATION_TOLERANCE_MS;
  if (durationMs < min || durationMs > max) return null;
  return Math.min(MAX_DURATION_SEC, Math.max(MIN_DURATION_SEC, Math.round(durationMs / 1000)));
}

/** True when the original is longer than a spot and needs a 15 s cut. */
export function needsTrim(durationMs: number): boolean {
  return durationMs > MAX_DURATION_SEC * 1000 + DURATION_TOLERANCE_MS;
}

/** Valid start of the 15 s cut (ms), clamped inside the video. */
export function clampTrimStart(trimStartMs: number | undefined, durationMs: number): number {
  const max = Math.max(0, durationMs - MAX_DURATION_SEC * 1000);
  return Math.min(max, Math.max(0, Math.round(trimStartMs ?? 0)));
}

/**
 * Checks on the original, before conversion (any codec/container: the server
 * turns it into H.264). Same messages in the browser and on the server.
 * Longer videos pass: they get cut to 15 s.
 */
export function checkSource(meta: {
  durationMs: number;
  width: number;
  height: number;
  sizeBytes: number;
  image?: boolean;
}): string[] {
  const errors: string[] = [];
  if (meta.sizeBytes > MAX_CREATIVE_BYTES) errors.push(`El archivo pesa más de ${MAX_CREATIVE_MB} MB.`);
  if (!meta.image) {
    const sec = meta.durationMs / 1000;
    if (meta.durationMs < MIN_DURATION_SEC * 1000 - DURATION_TOLERANCE_MS) {
      errors.push(`Dura ${sec.toFixed(1)} s. Debe durar al menos ${MIN_DURATION_SEC} segundos.`);
    } else if (sec > MAX_SOURCE_DURATION_SEC) {
      errors.push(`Dura ${Math.round(sec / 60)} min. Sube un video de máximo ${MAX_SOURCE_DURATION_SEC / 60} minutos.`);
    }
  }
  if (meta.width > 0 && meta.height > 0 && Math.min(meta.width, meta.height) < MIN_SHORT_SIDE_PX) {
    errors.push(
      `La resolución es ${meta.width}×${meta.height}. El lado corto debe medir al menos ${MIN_SHORT_SIDE_PX} px.`,
    );
  }
  return errors;
}

export function checkCreative(meta: VideoMeta): CreativeCheck {
  const errors: string[] = [];
  if (!isH264(meta.codec)) {
    errors.push("Este video usa un formato que el kiosco no puede reproducir (por ejemplo HEVC de iPhone). Súbelo en H.264.");
  }
  if (meta.sizeBytes > MAX_CREATIVE_BYTES) {
    errors.push(`El archivo pesa más de ${MAX_CREATIVE_MB} MB.`);
  }
  const durationSec = matchDuration(meta.durationMs);
  if (durationSec === null) {
    const actual = (meta.durationMs / 1000).toFixed(1);
    errors.push(`Dura ${actual} s. Debe durar entre ${MIN_DURATION_SEC} y ${MAX_DURATION_SEC} segundos.`);
  }
  if (Math.min(meta.width, meta.height) < MIN_SHORT_SIDE_PX) {
    errors.push(
      `La resolución es ${meta.width}×${meta.height}. El lado corto debe medir al menos ${MIN_SHORT_SIDE_PX} px.`,
    );
  }
  return {
    ok: errors.length === 0,
    errors,
    letterbox: letterboxFor(meta.width, meta.height),
    durationSec,
  };
}
