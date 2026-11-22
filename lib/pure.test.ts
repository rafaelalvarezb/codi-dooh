import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSequence } from "@/lib/rotation";
import {
  checkCreative,
  letterboxFor,
  isH264,
  matchDuration,
} from "@/lib/video/rules";
import { probeMp4 } from "@/lib/video/probe";
import { kioskPath, screenToken, verifyScreenToken } from "@/lib/screen-token";
import { billedCents, campaignDays, campaignMarketValueCents } from "@/lib/pricing";

describe("rotation (smooth weighted round-robin)", () => {
  const count = (seq: string[]) =>
    seq.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});

  it("gives each creative its share of voice", () => {
    const seq = buildSequence([
      { id: "a", weight: 3 },
      { id: "b", weight: 1 },
    ]);
    expect(seq).toHaveLength(4);
    expect(count(seq)).toEqual({ a: 3, b: 1 });
  });

  it("interleaves instead of playing in blocks", () => {
    expect(buildSequence([{ id: "a", weight: 2 }, { id: "b", weight: 1 }])).toEqual(["a", "b", "a"]);
    const seq = buildSequence([{ id: "a", weight: 2 }, { id: "b", weight: 2 }]);
    expect(seq).toEqual(["a", "b"]);
  });

  it("reduces by common divisor, ignores invalid weights and is deterministic", () => {
    expect(buildSequence([{ id: "x", weight: 4 }, { id: "y", weight: 2 }])).toHaveLength(3);
    expect(buildSequence([{ id: "x", weight: 0 }, { id: "y", weight: -1 }])).toEqual([]);
    expect(buildSequence([])).toEqual([]);
    const items = [{ id: "b", weight: 1 }, { id: "a", weight: 1 }, { id: "c", weight: 2 }];
    expect(buildSequence(items)).toEqual(buildSequence([...items].reverse()));
  });

  it("caps very long cycles while keeping every creative", () => {
    const seq = buildSequence([{ id: "big", weight: 1000 }, { id: "small", weight: 1 }]);
    expect(seq.length).toBeLessThanOrEqual(121);
    expect(seq).toContain("small");
  });
});

describe("creative rules", () => {
  const ok = { codec: "avc1.64001f", durationMs: 6000, width: 1920, height: 1080, sizeBytes: 5e6 };

  it("accepts H.264 6/10/15 s within ±0.5 s", () => {
    expect(checkCreative(ok).ok).toBe(true);
    expect(matchDuration(10_400)).toBe(10);
    expect(matchDuration(14_600)).toBe(15);
    expect(matchDuration(8_000)).toBeNull();
    expect(matchDuration(6_600)).toBeNull();
  });

  it("rejects other codecs, heavy files, wrong durations and low resolution", () => {
    expect(isH264("hvc1.1.6.L93")).toBe(false);
    expect(isH264("avc3.640028")).toBe(true);
    const bad = checkCreative({ codec: "hvc1", durationMs: 30_000, width: 640, height: 360, sizeBytes: 60e6 });
    expect(bad.ok).toBe(false);
    expect(bad.errors).toHaveLength(4);
  });

  it("never crops: tells where the black bars go in the 828×768 column", () => {
    expect(letterboxFor(1920, 1080)).toBe("topBottom"); // 16:9 is wider than the column
    expect(letterboxFor(1080, 1920)).toBe("sides"); // 9:16 is taller
    expect(letterboxFor(828, 768)).toBe("none");
    expect(letterboxFor(1080, 1000)).toBe("none"); // within 4%
    expect(checkCreative({ ...ok, width: 1080, height: 1920 }).letterbox).toBe("sides");
  });

  it("probes a real (fragmented) MP4 from the repo", () => {
    const buf = readFileSync(path.join(process.cwd(), "public/ads/spot-01.mp4"));
    const meta = probeMp4(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    // public/ads bumpers are fragmented MP4s: the movie header says 0 s, the
    // duration comes from the video samples.
    expect(meta).toEqual({ codec: "avc1.640028", durationMs: 6000, width: 1920, height: 1080 });
    expect(probeMp4(new ArrayBuffer(16))).toBeNull();
  });
});

describe("screen token", () => {
  const key = Buffer.from("s".repeat(32));
  it("verifies only the current version", () => {
    const t = screenToken("scr_1", 1, key);
    expect(verifyScreenToken("scr_1", 1, t, key)).toBe(true);
    expect(verifyScreenToken("scr_1", 2, t, key)).toBe(false);
    expect(verifyScreenToken("scr_2", 1, t, key)).toBe(false);
    expect(verifyScreenToken("scr_1", null, t, key)).toBe(false);
    expect(verifyScreenToken("scr_1", 1, `${t}x`, key)).toBe(false);
    expect(verifyScreenToken("scr_1", 1, undefined, key)).toBe(false);
  });
  it("builds the kiosk link", () => {
    expect(kioskPath({ id: "scr_1", profile: "parking" }, "tok")).toBe(
      "/?profile=parking&screen=scr_1&token=tok&session=1",
    );
  });
});

describe("pricing", () => {
  const start = new Date("2026-12-01T00:00:00Z");
  it("prorates spots × price by day over a 30-day month", () => {
    const end = new Date("2026-12-31T00:00:00Z");
    expect(campaignDays(start, end)).toBe(30);
    expect(
      campaignMarketValueCents({ spotPriceCents: 100_000, screens: [{ spots: 1 }, { spots: 2 }], startsAt: start, endsAt: end }),
    ).toBe(300_000);
    const week = new Date("2026-12-08T00:00:00Z");
    expect(
      campaignMarketValueCents({ spotPriceCents: 100_000, screens: [{ spots: 1 }], startsAt: start, endsAt: week }),
    ).toBe(23_333);
  });
  it("bills only paid campaigns", () => {
    expect(billedCents("paid", 500)).toBe(500);
    expect(billedCents("pilot", 500)).toBe(0);
    expect(billedCents("house", 500)).toBe(0);
  });
});
