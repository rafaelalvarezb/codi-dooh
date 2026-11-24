import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAILY_PAYERS,
  estimateReach,
  loopSeconds,
  minutesBetweenPlays,
  peoplePerDay,
  playsPerDay,
  roundEstimate,
  seenShare,
} from "./reach";

describe("reach estimates", () => {
  const load = { spots: 1, otherSpots: 3, dailyPayers: 400 };

  it("models the rotation loop", () => {
    expect(loopSeconds(load)).toBe(60); // 4 turns × 15 s
    expect(minutesBetweenPlays(load)).toBe(1);
    expect(playsPerDay(load)).toBe(960); // 16 h × 60 loops/h × 1
    expect(minutesBetweenPlays({ ...load, spots: 2 })).toBeCloseTo(75 / 2 / 60);
  });

  it("someone paying for 45 s sees your ad in proportion to your turns", () => {
    expect(seenShare(load)).toBe(0.75); // 45 s of a 60 s loop
    expect(peoplePerDay(load)).toBe(300);
    expect(seenShare({ spots: 3, otherSpots: 1, dailyPayers: null })).toBe(1); // capped
    expect(peoplePerDay({ spots: 1, otherSpots: 0, dailyPayers: null })).toBe(DEFAULT_DAILY_PAYERS);
  });

  it("uses the ad's own length for its turns", () => {
    expect(loopSeconds({ spots: 1, otherSpots: 1, dailyPayers: 0 }, 6)).toBe(21);
  });

  it("adds screens and days, rounds to a ±20% range and prices per person", () => {
    const r = estimateReach({ screens: [load, { spots: 2, otherSpots: 0, dailyPayers: 200 }], days: 30, totalCents: 300_000 });
    expect(r.people).toBe((300 + 200) * 30);
    expect(r.peopleRange).toEqual([12_000, 18_000]);
    expect(r.costPerPersonCents).toBeCloseTo(300_000 / 15_000);
    expect(estimateReach({ screens: [], days: 30, totalCents: 0 }).costPerPersonCents).toBeNull();
  });

  it("rounds to two significant figures", () => {
    expect(roundEstimate(12_345)).toBe(12_000);
    expect(roundEstimate(987)).toBe(990);
    expect(roundEstimate(7.4)).toBe(7);
  });
});
