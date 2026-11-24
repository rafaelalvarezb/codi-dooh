import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { probeMp4 } from "./probe";
import { checkSource } from "./rules";
import { execFileSync } from "node:child_process";
import { extractPoster, ffmpegPath, inspectSource, kioskArgs, parseSourceInfo, transcodeForKiosk } from "./transcode";

function probeFile(buf: Buffer) {
  return probeMp4(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

const IPHONE_HEVC = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'IMG_0420.MOV':
  Duration: 00:00:14.52, start: 0.000000, bitrate: 11234 kb/s
  Stream #0:0[0x1](und): Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67), 1920x1080, 10980 kb/s, 29.98 fps, 30 tbr, 600 tbn (default)
    Side data:
      displaymatrix: rotation of -90.00 degrees
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 160 kb/s (default)`;

describe("parseSourceInfo", () => {
  it("reads an iPhone HEVC clip and swaps sides for its rotation", () => {
    expect(parseSourceInfo(IPHONE_HEVC)).toEqual({ durationMs: 14_520, width: 1080, height: 1920, codec: "hevc" });
  });

  it("reads WebM/VP9 and rejects files without a video stream", () => {
    const webm = "  Duration: 00:00:30.04, start: 0.000000\n  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv), 1280x720, SAR 1:1 DAR 16:9, 30 fps";
    expect(parseSourceInfo(webm)).toMatchObject({ durationMs: 30_040, width: 1280, height: 720, codec: "vp9" });
    expect(parseSourceInfo("  Duration: 00:00:10.00\n  Stream #0:0: Audio: mp3, 44100 Hz")).toBeNull();
    expect(parseSourceInfo("not a video")).toBeNull();
  });
});

describe("kiosk rendition", () => {
  it("is H.264 yuv420p, ≤ 1280 px, ≤ 30 fps, muted, faststart", () => {
    const args = kioskArgs("in", "out.mp4").join(" ");
    expect(args).toContain("-c:v libx264");
    expect(args).toContain("format=yuv420p");
    expect(args).toContain("min(1280,iw)");
    expect(args).toContain("-fpsmax 30");
    expect(args).toContain("-an");
    expect(args).toContain("+faststart");
  });

  it("converts a real clip into a playable kiosk MP4 with a poster", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "tx-test-"));
    try {
      const input = path.join(process.cwd(), "public/ads/spot-01.mp4");
      const info = await inspectSource(input);
      expect(info).toMatchObject({ width: 1920, height: 1080, codec: "h264" });
      expect(checkSource({ ...info!, sizeBytes: (await stat(input)).size })).toEqual([]);

      const out = path.join(dir, "kiosk.mp4");
      await transcodeForKiosk(input, out);
      const buf = await readFile(out);
      const meta = probeMp4(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      expect(meta?.codec).toMatch(/^avc1\./);
      expect(meta?.width).toBe(1280);
      expect(meta?.height).toBe(720);
      expect(Math.abs((meta?.durationMs ?? 0) - 6000)).toBeLessThan(200);

      expect(await extractPoster(out, path.join(dir, "p.jpg"), meta!.durationMs)).toBe(true);
      expect((await stat(path.join(dir, "p.jpg"))).size).toBeGreaterThan(1000);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("cuts a longer video to the chosen 15 s", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "tx-cut-"));
    try {
      // 24 s source: spot-01 looped four times.
      const long = path.join(dir, "long.mp4");
      execFileSync(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-stream_loop", "3", "-i", path.join(process.cwd(), "public/ads/spot-01.mp4"), "-c", "copy", long]);
      const info = await inspectSource(long);
      expect(info!.durationMs).toBeGreaterThan(20_000);
      const out = path.join(dir, "cut.mp4");
      await transcodeForKiosk(long, out, { trimStartMs: 5_000, durationSec: 15 });
      const meta = probeFile(await readFile(out));
      expect(Math.abs((meta?.durationMs ?? 0) - 15_000)).toBeLessThan(200);
      expect(kioskArgs("in", "out", { trimStartMs: 5_000, durationSec: 15 }).join(" ")).toContain("-ss 5.000 -i in -t 15");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90_000);

  it("turns an image into a 15 s still spot", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "tx-img-"));
    try {
      const img = path.join(process.cwd(), "public/landing/maquina-cobro.webp");
      const info = await inspectSource(img);
      expect(info).toMatchObject({ width: 1856, height: 2304 });
      const out = path.join(dir, "still.mp4");
      await transcodeForKiosk(img, out, { image: true, durationSec: 15 });
      const meta = probeFile(await readFile(out));
      expect(meta?.codec).toMatch(/^avc1\./);
      expect(Math.abs((meta?.durationMs ?? 0) - 15_000)).toBeLessThan(200);
      expect(Math.max(meta!.width, meta!.height)).toBe(1280);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90_000);
});
