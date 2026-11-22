import { describe, expect, it } from "vitest";
import { clabeCheckDigit, maskClabe, normalizeClabe, validateClabe } from "./clabe";
import {
  bookingShareCents,
  bookingValueCents,
  mxMonth,
  nextPayout,
  periodRevenue,
  recentMonths,
  splitRevenue,
  type Booking,
} from "./revenue";
import { campaignMarketValueCents } from "./pricing";

describe("CLABE", () => {
  it("computes the Banxico check digit", () => {
    // Worked example: 03218000011835971 → 9 (Banxico documentation).
    expect(clabeCheckDigit("03218000011835971")).toBe(9);
    expect(clabeCheckDigit("01218000123456789")).toBe(9);
    expect(clabeCheckDigit("00000000000000000")).toBe(0);
  });

  it("accepts a valid CLABE and names the bank", () => {
    expect(validateClabe("012180001234567899")).toEqual({
      ok: true,
      clabe: "012180001234567899",
      bankCode: "012",
      bankName: "BBVA México",
    });
    // Grouped with spaces or dashes, as people paste it.
    const grouped = validateClabe("012 180 00123456789 9");
    expect(grouped.ok).toBe(true);
    expect(normalizeClabe("012-180-001234567899")).toBe("012180001234567899");
  });

  it("finds the bank for other prefixes", () => {
    const first17 = "07218000123456789";
    const res = validateClabe(first17 + clabeCheckDigit(first17));
    expect(res).toMatchObject({ ok: true, bankCode: "072", bankName: "Banorte" });
    const nu = "63818000123456789";
    expect(validateClabe(nu + clabeCheckDigit(nu))).toMatchObject({ ok: true, bankName: "Nu México" });
  });

  it("rejects wrong length, letters, unknown banks and bad check digits", () => {
    expect(validateClabe("01218000123456789")).toMatchObject({ ok: false, error: expect.stringContaining("17") });
    expect(validateClabe("01218000123456789a")).toMatchObject({ ok: false, error: expect.stringContaining("números") });
    const unknown = "99918000123456789";
    expect(validateClabe(unknown + clabeCheckDigit(unknown))).toMatchObject({ ok: false, error: expect.stringContaining("999") });
    expect(validateClabe("012180001234567890")).toMatchObject({ ok: false, error: expect.stringContaining("último dígito") });
  });

  it("masks for display", () => {
    expect(maskClabe("012180001234567899")).toBe("•••• 7899");
  });
});

describe("revenue split", () => {
  it("defaults to 30% platform / 70% host and never loses a centavo", () => {
    expect(splitRevenue(100_000, 3000)).toEqual({ platformCents: 30_000, hostCents: 70_000 });
    const odd = splitRevenue(333, 3000);
    expect(odd.platformCents + odd.hostCents).toBe(333);
    expect(splitRevenue(1000, 0)).toEqual({ platformCents: 0, hostCents: 1000 });
    expect(splitRevenue(1000, 12_000)).toEqual({ platformCents: 1000, hostCents: 0 });
  });
});

function booking(extra: Partial<Booking> = {}): Booking {
  return {
    campaignId: "cmp",
    billing: "paid",
    spotPriceCents: 100_000, // $1,000 per spot-month
    startsAt: new Date("2026-11-16T06:00:00Z"), // Nov 16, 00:00 MX
    endsAt: new Date("2026-12-16T06:00:00Z"), // 30 days
    screenId: "scr_a",
    spots: 2,
    ...extra,
  };
}

describe("bookings and periods", () => {
  it("values a booking like the campaign total", () => {
    const b = booking();
    expect(bookingValueCents(b)).toBe(200_000);
    expect(bookingValueCents(b)).toBe(
      campaignMarketValueCents({ spotPriceCents: b.spotPriceCents, screens: [b], startsAt: b.startsAt, endsAt: b.endsAt }),
    );
  });

  it("spreads a booking across calendar months and the months add up", () => {
    const b = booking();
    const nov = mxMonth(new Date("2026-11-20T12:00:00Z"));
    const dec = mxMonth(new Date("2026-12-20T12:00:00Z"));
    const inNov = bookingShareCents(b, nov.start, nov.end); // 15 of 30 days
    const inDec = bookingShareCents(b, dec.start, dec.end);
    expect(inNov).toBe(100_000);
    expect(inNov + inDec).toBe(bookingValueCents(b));
  });

  it("recognises revenue only up to now and splits it", () => {
    const now = new Date("2026-11-21T06:00:00Z"); // 5 days into the booking
    const nov = mxMonth(now);
    const r = periodRevenue(
      [booking(), booking({ billing: "pilot", campaignId: "pilot" }), booking({ billing: "house", campaignId: "house" })],
      nov,
      3000,
      now,
    );
    expect(r.grossCents).toBe(Math.round((200_000 * 5) / 30));
    expect(r.hostCents).toBe(r.grossCents - Math.round(r.grossCents * 0.3));
    expect(r.pilotValueCents).toBe(r.grossCents);
    expect(r.byScreen.get("scr_a")?.grossCents).toBe(r.grossCents);
  });

  it("handles Mexico City month boundaries", () => {
    // Dec 1, 05:59 UTC is still Nov 30 in Mexico City.
    expect(mxMonth(new Date("2026-12-01T05:59:00Z"))).toMatchObject({ year: 2026, month: 11 });
    expect(mxMonth(new Date("2026-12-01T06:00:00Z"))).toMatchObject({ year: 2026, month: 12 });
    const months = recentMonths(new Date("2027-01-10T12:00:00Z"), 3);
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(["2026-11", "2026-12", "2027-1"]);
    expect(months[2].start.toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });
});

describe("next payout", () => {
  it("pays last month's total before payout day", () => {
    const p = nextPayout(new Date("2026-12-03T18:00:00Z"), 5);
    expect(p.closed).toBe(true);
    expect(p.period).toMatchObject({ year: 2026, month: 11 });
    expect(p.payDate.toISOString()).toBe("2026-12-05T06:00:00.000Z");
  });

  it("from payout day on, accrues the current month for next month", () => {
    const p = nextPayout(new Date("2026-11-21T18:00:00Z"), 5);
    expect(p.closed).toBe(false);
    expect(p.period).toMatchObject({ year: 2026, month: 11 });
    expect(p.payDate.toISOString()).toBe("2026-12-05T06:00:00.000Z");
    // December → paid January 5 of the next year.
    expect(nextPayout(new Date("2026-12-20T18:00:00Z"), 5).payDate.toISOString()).toBe("2027-01-05T06:00:00.000Z");
  });

  it("clamps silly payout days", () => {
    expect(nextPayout(new Date("2026-11-21T18:00:00Z"), 40).payDate.getUTCDate()).toBe(28);
  });
});
