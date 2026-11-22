/**
 * Money accounting (no money moves here). All amounts in centavos.
 *
 * A booking = one campaign on one screen. Its value is the list price
 * (spots × price per spot-month × days / 30, like the campaign total) and it
 * is recognised evenly over the campaign's time. Revenue for a period is the
 * share of each booking that falls inside it, so the months add up to the
 * campaign total.
 *
 * - paid  → gross ad revenue, split platform commission / host share
 * - pilot → no revenue; its market value is shown apart ("valor de pilotos")
 * - house → nothing
 *
 * Mexico City is UTC−6 all year (no DST since 2022), so months are computed
 * with a fixed offset.
 */
import { campaignDays, MONTH_DAYS, type BillingKind } from "./pricing";

export const MX_OFFSET_MS = -6 * 3_600_000;

export type Booking = {
  campaignId: string;
  billing: BillingKind;
  spotPriceCents: number;
  startsAt: Date;
  endsAt: Date;
  screenId: string;
  spots: number;
};

export type Split = { platformCents: number; hostCents: number };

/** Platform keeps commissionBps / 10 000 (rounded); the host keeps the rest. */
export function splitRevenue(grossCents: number, commissionBps: number): Split {
  const bps = Math.min(10_000, Math.max(0, commissionBps));
  const platformCents = Math.round((grossCents * bps) / 10_000);
  return { platformCents, hostCents: grossCents - platformCents };
}

/** Full list value of one booking (same formula as the campaign total). */
export function bookingValueCents(b: Booking): number {
  return Math.round((Math.max(0, b.spots) * b.spotPriceCents * campaignDays(b.startsAt, b.endsAt)) / MONTH_DAYS);
}

/** Share of a booking's value recognised in [from, to). */
export function bookingShareCents(b: Booking, from: Date, to: Date): number {
  const start = b.startsAt.getTime();
  const end = b.endsAt.getTime();
  const span = end - start;
  if (span <= 0) return 0;
  const overlap = Math.min(end, to.getTime()) - Math.max(start, from.getTime());
  if (overlap <= 0) return 0;
  return Math.round((bookingValueCents(b) * overlap) / span);
}

export type Period = { start: Date; end: Date };

/** Calendar month (Mexico City) containing `d`. */
export function mxMonth(d: Date): Period & { year: number; month: number } {
  const local = new Date(d.getTime() + MX_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;
  return { year, month, ...monthPeriod(year, month) };
}

export function monthPeriod(year: number, month: number): Period {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - MX_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - MX_OFFSET_MS),
  };
}

/** The `count` most recent months up to the one containing `now`, oldest first. */
export function recentMonths(now: Date, count: number) {
  const { year, month } = mxMonth(now);
  const out: Array<Period & { year: number; month: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const idx = year * 12 + (month - 1) - i;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    out.push({ year: y, month: m, ...monthPeriod(y, m) });
  }
  return out;
}

export type PeriodRevenue = {
  grossCents: number;
  platformCents: number;
  hostCents: number;
  /** Market value of pilot campaigns that ran on these screens (not income). */
  pilotValueCents: number;
  byScreen: Map<string, { grossCents: number; hostCents: number }>;
};

/**
 * Revenue recognised in [from, min(to, now)) for the given bookings.
 * The split is applied to the total; per-screen host shares are rounded
 * individually (display only).
 */
export function periodRevenue(bookings: Booking[], period: Period, commissionBps: number, now: Date): PeriodRevenue {
  const to = new Date(Math.min(period.end.getTime(), now.getTime()));
  let gross = 0;
  let pilot = 0;
  const byScreen = new Map<string, { grossCents: number; hostCents: number }>();
  for (const b of bookings) {
    if (b.billing === "house") continue;
    const share = bookingShareCents(b, period.start, to);
    if (share === 0) continue;
    if (b.billing === "pilot") {
      pilot += share;
      continue;
    }
    gross += share;
    const cur = byScreen.get(b.screenId) ?? { grossCents: 0, hostCents: 0 };
    cur.grossCents += share;
    byScreen.set(b.screenId, cur);
  }
  for (const v of byScreen.values()) v.hostCents = splitRevenue(v.grossCents, commissionBps).hostCents;
  return { grossCents: gross, ...splitRevenue(gross, commissionBps), pilotValueCents: pilot, byScreen };
}

/**
 * Next payout to the host's CLABE. Earnings of a month are paid on
 * `payoutDay` of the following month. Before that day, the next payout is
 * last month's (closed) total; from that day on, it is this month's so far.
 */
export function nextPayout(now: Date, payoutDay: number) {
  const cur = mxMonth(now);
  const localDay = new Date(now.getTime() + MX_OFFSET_MS).getUTCDate();
  const day = Math.min(28, Math.max(1, Math.round(payoutDay)));
  if (localDay < day) {
    const [prev] = recentMonths(now, 2);
    return { period: prev, payDate: new Date(Date.UTC(cur.year, cur.month - 1, day) - MX_OFFSET_MS), closed: true };
  }
  const next = new Date(Date.UTC(cur.year, cur.month, day) - MX_OFFSET_MS);
  return { period: cur, payDate: next, closed: false };
}
