/**
 * "Verified attention": a CoDi payment counts for a campaign when the person
 * was paying at the same screen while that campaign's ad was on air.
 *
 * Payment window = [paidAt - ATTENTION_MAX_WINDOW_MS, paidAt], clipped to
 * start no earlier than the QR creation (createdAt). The clip guards against a
 * QR left open for a long time matching every ad of the afternoon.
 *
 * Overlap is inclusive on both ends: payment window ∩ play [startedAt, endedAt].
 * Each payment counts at most once per campaign, even if it overlapped two of
 * its spots; it may count for several campaigns (each one was on screen).
 * Demo payments only match demo plays and real ones only real plays.
 *
 * The same rule is implemented in SQL in lib/data/analytics.ts; a test checks
 * both agree.
 */

export const ATTENTION_MAX_WINDOW_MS = 15 * 60 * 1000;

export type AttentionPlay = {
  screenId: string;
  campaignId: string | null;
  startedAt: Date;
  endedAt: Date;
  isDemo: boolean;
};

export type AttentionPayment = {
  qrId: string;
  machineId: string | null;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  amountCents: number | null;
  isDemo: boolean;
};

export function paymentWindow(p: Pick<AttentionPayment, "createdAt" | "paidAt">): [number, number] | null {
  if (!p.paidAt) return null;
  const end = p.paidAt.getTime();
  const start = Math.max(p.createdAt.getTime(), end - ATTENTION_MAX_WINDOW_MS);
  return [Math.min(start, end), end];
}

export function overlaps(play: AttentionPlay, payment: AttentionPayment): boolean {
  if (payment.status !== "PAID" || !payment.machineId) return false;
  if (payment.machineId !== play.screenId || payment.isDemo !== play.isDemo) return false;
  const w = paymentWindow(payment);
  if (!w) return false;
  return w[0] <= play.endedAt.getTime() && w[1] >= play.startedAt.getTime();
}

/** campaignId → set of qrIds paid while that campaign was on screen. */
export function attendedPaymentsByCampaign(
  plays: AttentionPlay[],
  payments: AttentionPayment[],
): Map<string, Set<string>> {
  const byScreen = new Map<string, AttentionPayment[]>();
  for (const p of payments) {
    if (p.status !== "PAID" || !p.machineId) continue;
    const list = byScreen.get(p.machineId) ?? [];
    list.push(p);
    byScreen.set(p.machineId, list);
  }
  const out = new Map<string, Set<string>>();
  for (const play of plays) {
    if (!play.campaignId) continue;
    for (const p of byScreen.get(play.screenId) ?? []) {
      if (!overlaps(play, p)) continue;
      const set = out.get(play.campaignId) ?? new Set<string>();
      set.add(p.qrId);
      out.set(play.campaignId, set);
    }
  }
  return out;
}

/** Cost per unit in centavos, or null when there is nothing to divide by. */
export function costPer(totalCents: number, units: number): number | null {
  return units > 0 ? Math.round(totalCents / units) : null;
}
