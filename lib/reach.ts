/**
 * "What do I get for this?" — reach estimates shown while booking, like ad
 * platforms do. Pure and deliberately simple, so it can be explained in one
 * sentence on screen ("¿Cómo lo calculamos?").
 *
 * Each screen plays a loop: every booked spot is one turn. Your spots are
 * your turns. A person paying at the machine faces the screen for about
 * DWELL_SEC, so they see your ad if one of your turns falls in that window.
 */

/** Hours a parking pay station sees traffic (7:00–23:00). */
export const OPEN_HOURS = 16;
/** Typical length of other advertisers' turns. */
export const DEFAULT_SLOT_SEC = 15;
/** Time a person spends in front of the screen while paying. */
export const DWELL_SEC = 45;
/** People paying per day when the host hasn't given a number. */
export const DEFAULT_DAILY_PAYERS = 300;
/** Estimates are shown as a ±20% range. */
export const RANGE = 0.2;

export type ScreenLoad = {
  /** Your spots on this screen. */
  spots: number;
  /** Spots other campaigns already have on it. */
  otherSpots: number;
  dailyPayers: number | null;
};

/** Seconds of one full loop of the rotation. */
export function loopSeconds(load: ScreenLoad, adSec = DEFAULT_SLOT_SEC): number {
  return load.otherSpots * DEFAULT_SLOT_SEC + load.spots * adSec;
}

/** Minutes between two plays of your ad on this screen. */
export function minutesBetweenPlays(load: ScreenLoad, adSec = DEFAULT_SLOT_SEC): number {
  if (load.spots <= 0) return Infinity;
  return loopSeconds(load, adSec) / load.spots / 60;
}

export function playsPerDay(load: ScreenLoad, adSec = DEFAULT_SLOT_SEC): number {
  if (load.spots <= 0) return 0;
  return ((OPEN_HOURS * 3600) / loopSeconds(load, adSec)) * load.spots;
}

/** Share of people paying here who have your ad on screen while they pay. */
export function seenShare(load: ScreenLoad, adSec = DEFAULT_SLOT_SEC): number {
  if (load.spots <= 0) return 0;
  return Math.min(1, (DWELL_SEC * load.spots) / loopSeconds(load, adSec));
}

export function peoplePerDay(load: ScreenLoad, adSec = DEFAULT_SLOT_SEC): number {
  return (load.dailyPayers ?? DEFAULT_DAILY_PAYERS) * seenShare(load, adSec);
}

export type ReachEstimate = {
  plays: number;
  people: number;
  /** Rounded range for display. */
  playsRange: [number, number];
  peopleRange: [number, number];
  /** Centavos per person (null when nothing is reached or it's free). */
  costPerPersonCents: number | null;
};

/** Rounds to 2 significant figures so estimates don't look falsely precise. */
export function roundEstimate(n: number): number {
  if (n < 10) return Math.round(n);
  const mag = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

export function estimateReach(input: {
  screens: ScreenLoad[];
  days: number;
  adSec?: number;
  totalCents: number;
}): ReachEstimate {
  const adSec = input.adSec && input.adSec > 0 ? input.adSec : DEFAULT_SLOT_SEC;
  let plays = 0;
  let people = 0;
  for (const s of input.screens) {
    plays += playsPerDay(s, adSec) * input.days;
    people += peoplePerDay(s, adSec) * input.days;
  }
  const range = (n: number): [number, number] => [roundEstimate(n * (1 - RANGE)), roundEstimate(n * (1 + RANGE))];
  return {
    plays,
    people,
    playsRange: range(plays),
    peopleRange: range(people),
    costPerPersonCents: people > 0 && input.totalCents > 0 ? input.totalCents / people : null,
  };
}
