/**
 * Campaign pricing. A "spot" is one slot in a screen's rotation; price is per
 * spot, per screen, per 30-day month, prorated by day. Pure, in centavos.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MONTH_DAYS = 30;

export type BillingKind = "paid" | "pilot" | "house";

/** Days a campaign runs, counting partial days as full (min 1). */
export function campaignDays(startsAt: Date, endsAt: Date): number {
  return Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / DAY_MS));
}

/** Market value of the booking (what it would cost at list price). */
export function campaignMarketValueCents(input: {
  spotPriceCents: number;
  screens: Array<{ spots: number }>;
  startsAt: Date;
  endsAt: Date;
}): number {
  const spots = input.screens.reduce((acc, s) => acc + Math.max(0, s.spots), 0);
  const days = campaignDays(input.startsAt, input.endsAt);
  return Math.round((spots * input.spotPriceCents * days) / MONTH_DAYS);
}

/**
 * Share of the booking already run, prorated by elapsed time (0 before the
 * start, the full value after the end). Used for cost per play "to date".
 */
export function accruedCents(totalCents: number, startsAt: Date, endsAt: Date, now: Date): number {
  const span = endsAt.getTime() - startsAt.getTime();
  if (span <= 0) return totalCents;
  const elapsed = Math.min(span, Math.max(0, now.getTime() - startsAt.getTime()));
  return Math.round((totalCents * elapsed) / span);
}

/** What the advertiser owes: pilots and house ads are $0. */
export function billedCents(billing: BillingKind, marketValueCents: number): number {
  return billing === "paid" ? marketValueCents : 0;
}

export function formatMxn(cents: number, opts?: { decimals?: boolean }): string {
  return (cents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: opts?.decimals === false ? 0 : 2,
    maximumFractionDigits: opts?.decimals === false ? 0 : 2,
  });
}
