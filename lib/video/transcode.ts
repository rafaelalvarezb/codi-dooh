/**
 * Server-side video normalization with ffmpeg (bundled by `ffmpeg-static`).
 *
 * Advertisers upload whatever their editor or phone produced (MP4, MOV,
 * HEVC from iPhone, WebM, MKV…). We turn it into the one format every kiosk
 * plays smoothly: H.264 High, yuv420p, ≤ 1280 px on the long side, ≤ 30 fps,
 * no audio (kiosks are muted), `+faststart` so playback starts while it
 * downloads. A 30 s spot ends up around 5–12 MB instead of 40–70 MB.
 */
import "server-only";
import { execFile } from "node:child_process";
import bundledFfmpeg from "ffmpeg-static";

/** Longest side of the kiosk output. The DOOH column is 828×768 on a 1280×800 tablet. */
export const OUTPUT_MAX_SIDE = 1280;
export const OUTPUT_MAX_FPS = 30;
const TRANSCODE_TIMEOUT_MS = 240_000;

export type SourceInfo = {
  durationMs: number;
  /** Display size (after the rotation phones store in metadata). */
  width: number;
  height: number;
  codec: string;
};

export function ffmpegPath(): string {
  const fromEnv = process.env.FFMPEG_PATH;
  if (fromEnv) return fromEnv;
  if (!bundledFfmpeg) throw new Error("ffmpeg no está disponible en este servidor.");
  return bundledFfmpeg;
}

function run(args: string[], timeoutMs: number): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath(),
      args,
      { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, _stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === "ENOENT") return reject(error);
        if (error && error.killed) return reject(new Error("TIMEOUT"));
        const code = typeof (error as { code?: unknown } | null)?.code === "number" ? (error as { code: number }).code : 0;
        resolve({ code, stderr: String(stderr) });
      },
    );
  });
}

/**
 * Parses `ffmpeg -i` output (ffmpeg prints stream info to stderr and exits
 * with 1 because no output was given). Pure; exported for tests.
 */
export function parseSourceInfo(stderr: string): SourceInfo | null {
  const dur = stderr.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const video = stderr.match(/Stream #\d+:\d+[^\n]*?: Video: ([a-z0-9_]+)[^\n]*?(\d{2,5})x(\d{2,5})/i);
  if (!video) return null;
  // Still images report "Duration: N/A" (or a single frame); callers know they're images.
  const durationMs = dur ? Math.round((Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3])) * 1000) : 0;
  if (!dur && !/Duration:\s*N\/A/.test(stderr)) return null;
  let width = Number(video[2]);
  let height = Number(video[3]);
  // Phones record landscape pixels plus a rotation; ffmpeg auto-rotates on output.
  const rot = stderr.match(/rotation of (-?\d+(?:\.\d+)?) degrees/i) ?? stderr.match(/\brotate\s*:\s*(-?\d+)/i);
  if (rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90) [width, height] = [height, width];
  return { durationMs, width, height, codec: video[1].toLowerCase() };
}

export async function inspectSource(file: string): Promise<SourceInfo | null> {
  const { stderr } = await run(["-hide_banner", "-i", file], 30_000);
  return parseSourceInfo(stderr);
}

export type CutOptions = {
  /** Start of the cut in ms (videos longer than a spot). */
  trimStartMs?: number;
  /** Length of the output in seconds (cut videos and images). */
  durationSec?: number;
  /** The source is a still image: loop it into a video. */
  image?: boolean;
};

/** ffmpeg arguments for the kiosk rendition. Pure; exported for tests. */
export function kioskArgs(input: string, output: string, cut: CutOptions = {}): string[] {
  const s = OUTPUT_MAX_SIDE;
  const before: string[] = cut.image
    ? ["-loop", "1", "-framerate", String(OUTPUT_MAX_FPS)]
    : cut.trimStartMs
      ? ["-ss", (cut.trimStartMs / 1000).toFixed(3)]
      : [];
  const length = cut.durationSec ? ["-t", String(cut.durationSec)] : [];
  return [
    "-hide_banner",
    "-y",
    ...before,
    "-i", input,
    ...length,
    "-map", "0:v:0",
    "-an", "-sn", "-dn",
    "-map_metadata", "-1",
    "-vf",
    `scale=w='min(${s},iw)':h='min(${s},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`,
    "-fpsmax", String(OUTPUT_MAX_FPS),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-profile:v", "high",
    "-level:v", "4.1",
    ...(cut.image ? ["-tune", "stillimage"] : []),
    "-crf", "23",
    "-maxrate", "4M",
    "-bufsize", "8M",
    "-movflags", "+faststart",
    output,
  ];
}

export async function transcodeForKiosk(input: string, output: string, cut: CutOptions = {}): Promise<void> {
  const { code, stderr } = await run(kioskArgs(input, output, cut), TRANSCODE_TIMEOUT_MS);
  if (code !== 0) {
    console.error("[transcode] ffmpeg failed", stderr.slice(-2000));
    throw new Error("TRANSCODE_FAILED");
  }
}

/** A JPEG frame ~1 s in (or the middle of very short clips), ≤ 720 px. */
export async function extractPoster(video: string, output: string, durationMs: number): Promise<boolean> {
  const at = Math.min(1, durationMs / 2000).toFixed(2);
  const { code } = await run(
    ["-hide_banner", "-y", "-ss", at, "-i", video, "-frames:v", "1", "-vf", "scale=w='min(720,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease", "-q:v", "4", output],
    30_000,
  );
  return code === 0;
}
