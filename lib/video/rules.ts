/**
 * Creative rules, shared by the browser (instant feedback) and the server
 * (authoritative re-validation). Pure.
 */

export const MAX_CREATIVE_BYTES = 50 * 1024 * 1024;
export const ALLOWED_DURATIONS_SEC = [6, 10, 15] as const;
export const DURATION_TOLERANCE_MS = 500;
export const MIN_SHORT_SIDE_PX = 720;

/**
 * DOOH column of the kiosk at its native 1280×800 frame:
 * (1280 − 2×16 padding) − 420 panel = 828 wide, 800 − 2×16 = 768 tall.
 * Source: components/KioskShell.tsx grid `minmax(0,1fr) 420px`.
 */
export const DOOH_COLUMN = { width: 828, height: 768 } as const;
export const KIOSK_FRAME = { width: 1280, height: 800, padding: 16, panel: 420 } as const;

/** Crop above this share of the video triggers a warning in the preview. */
export const CROP_WARNING_THRESHOLD = 0.25;

export type FitMode = "cover" | "blur";

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
  fitMode: FitMode;
  /** Share of the video hidden by `object-cover` in the DOOH column (0–1). */
  coverCrop: number;
  /** Share actually hidden with the chosen fit mode (0 for blur). */
  visibleCrop: number;
  durationSec: number | null;
};

/** H.264 in MP4 (`avc1` / `avc3`), which the Raspberry Pi decodes in hardware. */
export function isH264(codec: string): boolean {
  return /^avc[13](\.|$)/i.test(codec.trim());
}

/** Landscape (and square) fills the column; portrait shows whole over a blurred poster. */
export function fitModeFor(width: number, height: number): FitMode {
  return width >= height ? "cover" : "blur";
}

/** Fraction of the video cut off when scaled to cover a box (0 = perfect fit). */
export function coverCropFraction(
  width: number,
  height: number,
  box: { width: number; height: number } = DOOH_COLUMN,
): number {
  if (width <= 0 || height <= 0) return 0;
  const videoAr = width / height;
  const boxAr = box.width / box.height;
  const kept = videoAr > boxAr ? boxAr / videoAr : videoAr / boxAr;
  return Math.max(0, Math.min(1, 1 - kept));
}

export function matchDuration(durationMs: number): number | null {
  for (const sec of ALLOWED_DURATIONS_SEC) {
    if (Math.abs(durationMs - sec * 1000) <= DURATION_TOLERANCE_MS) return sec;
  }
  return null;
}

export function checkCreative(meta: VideoMeta): CreativeCheck {
  const errors: string[] = [];
  if (!isH264(meta.codec)) {
    errors.push("El video debe estar en MP4 con H.264. Expórtalo de nuevo con ese formato.");
  }
  if (meta.sizeBytes > MAX_CREATIVE_BYTES) {
    errors.push("El archivo pesa más de 50 MB.");
  }
  const durationSec = matchDuration(meta.durationMs);
  if (durationSec === null) {
    const actual = (meta.durationMs / 1000).toFixed(1);
    errors.push(`Dura ${actual} s. Debe durar 6, 10 o 15 segundos.`);
  }
  if (Math.min(meta.width, meta.height) < MIN_SHORT_SIDE_PX) {
    errors.push(
      `La resolución es ${meta.width}×${meta.height}. El lado corto debe medir al menos ${MIN_SHORT_SIDE_PX} px.`,
    );
  }
  const fitMode = fitModeFor(meta.width, meta.height);
  const coverCrop = coverCropFraction(meta.width, meta.height);
  return {
    ok: errors.length === 0,
    errors,
    fitMode,
    coverCrop,
    visibleCrop: fitMode === "cover" ? coverCrop : 0,
    durationSec,
  };
}
