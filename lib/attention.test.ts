import { describe, expect, it } from "vitest";
import {
  ATTENTION_MAX_WINDOW_MS,
  attendedPaymentsByCampaign,
  costPer,
  overlaps,
  paymentWindow,
  type AttentionPayment,
  type AttentionPlay,
} from "./attention";
import { accruedCents } from "./pricing";

const T = Date.parse("2026-11-20T18:00:00Z");
const at = (sec: number) => new Date(T + sec * 1000);

const play = (startSec: number, lenSec = 6, extra: Partial<AttentionPlay> = {}): AttentionPlay => ({
  screenId: "scr_a",
  campaignId: "cmp_1",
  startedAt: at(startSec),
  endedAt: at(startSec + lenSec),
  isDemo: false,
  ...extra,
});

const pay = (createdSec: number, paidSec: number | null, extra: Partial<AttentionPayment> = {}): AttentionPayment => ({
  qrId: `qr_${createdSec}_${paidSec}`,
  machineId: "scr_a",
  status: paidSec == null ? "PENDING" : "PAID",
  createdAt: at(createdSec),
  paidAt: paidSec == null ? null : at(paidSec),
  amountCents: 1,
  isDemo: false,
  ...extra,
});

describe("overlaps", () => {
  it("counts a payment whose QR window touches the play", () => {
    expect(overlaps(play(0), pay(-30, 2))).toBe(true); // paid during the spot
    expect(overlaps(play(0), pay(3, 40))).toBe(true); // QR created during the spot
    expect(overlaps(play(0), pay(-30, 60))).toBe(true); // window covers the whole spot
  });

  it("is inclusive at the edges", () => {
    expect(overlaps(play(0), pay(-30, 0))).toBe(true); // paid exactly when the spot starts
    expect(overlaps(play(0), pay(6, 20))).toBe(true); // QR created exactly when it ends
  });

  it("rejects payments before or after the spot", () => {
    expect(overlaps(play(0), pay(-60, -1))).toBe(false);
    expect(overlaps(play(0), pay(7, 30))).toBe(false);
  });

  it("requires the same screen, a paid status and the same demo flag", () => {
    expect(overlaps(play(0), pay(-30, 2, { machineId: "scr_b" }))).toBe(false);
    expect(overlaps(play(0), pay(-30, null))).toBe(false);
    expect(overlaps(play(0), pay(-30, 2, { isDemo: true }))).toBe(false);
    expect(overlaps(play(0, 6, { isDemo: true }), pay(-30, 2, { isDemo: true }))).toBe(true);
  });

  it("caps a long-open QR to the last 15 minutes before payment", () => {
    const maxSec = ATTENTION_MAX_WINDOW_MS / 1000;
    // QR created 2 h before paying: a spot 1 h before payment does not count…
    expect(overlaps(play(0), pay(-3600, 3600))).toBe(false);
    // …but one inside the last 15 minutes does.
    expect(overlaps(play(3600 - maxSec + 10), pay(-3600, 3600))).toBe(true);
    expect(paymentWindow(pay(0, 10))).toEqual([at(0).getTime(), at(10).getTime()]);
  });

  it("tolerates paidAt before createdAt (clock skew) as a point window", () => {
    expect(paymentWindow(pay(10, 5))).toEqual([at(5).getTime(), at(5).getTime()]);
    expect(overlaps(play(0), pay(10, 5))).toBe(true);
  });
});

describe("attendedPaymentsByCampaign", () => {
  it("counts each payment once per campaign and can credit several campaigns", () => {
    const plays = [
      play(0, 6, { campaignId: "cmp_1" }),
      play(6, 6, { campaignId: "cmp_2" }),
      play(12, 6, { campaignId: "cmp_1" }),
      play(100, 6, { campaignId: "cmp_3" }),
      play(0, 6, { campaignId: null }), // house fallback, no campaign
    ];
    const payments = [pay(1, 14), pay(200, 210)];
    const out = attendedPaymentsByCampaign(plays, payments);
    expect([...(out.get("cmp_1") ?? [])]).toEqual(["qr_1_14"]);
    expect([...(out.get("cmp_2") ?? [])]).toEqual(["qr_1_14"]);
    expect(out.has("cmp_3")).toBe(false);
  });
});

describe("cost helpers", () => {
  it("divides only when there is something to divide by", () => {
    expect(costPer(10_000, 4)).toBe(2500);
    expect(costPer(10_000, 0)).toBeNull();
  });

  it("accrues the booking value by elapsed time", () => {
    const start = new Date("2026-11-01T00:00:00Z");
    const end = new Date("2026-11-11T00:00:00Z");
    expect(accruedCents(1000, start, end, new Date("2026-10-01T00:00:00Z"))).toBe(0);
    expect(accruedCents(1000, start, end, new Date("2026-11-06T00:00:00Z"))).toBe(500);
    expect(accruedCents(1000, start, end, new Date("2026-12-01T00:00:00Z"))).toBe(1000);
  });
});
