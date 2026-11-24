/**
 * Weighted round-robin (share of voice). Uses the "smooth" variant (as in
 * nginx) so heavier creatives are interleaved instead of played in a block:
 * weights {A:2, B:1} → A B A, not A A B.
 */

export type Weighted = { id: string; weight: number };

const MAX_SEQUENCE = 120;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** One full cycle: each id appears exactly `weight` times (after reduction). */
export function buildSequence(items: Weighted[]): string[] {
  const valid = items
    .filter((i) => Number.isFinite(i.weight) && i.weight > 0)
    .map((i) => ({ id: i.id, weight: Math.floor(i.weight) }))
    .filter((i) => i.weight > 0)
    // Stable order so every kiosk computes the same cycle.
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  if (valid.length === 0) return [];

  // Reduce by the common divisor ({4,2} plays like {2,1}) and cap the length.
  const g = valid.reduce((acc, i) => gcd(acc, i.weight), valid[0].weight);
  let weights = valid.map((i) => i.weight / g);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total > MAX_SEQUENCE) {
    const scale = MAX_SEQUENCE / total;
    weights = weights.map((w) => Math.max(1, Math.round(w * scale)));
  }

  const current = valid.map(() => 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  const out: string[] = [];
  for (let step = 0; step < sum; step++) {
    let best = 0;
    for (let i = 0; i < valid.length; i++) {
      current[i] += weights[i];
      if (current[i] > current[best]) best = i;
    }
    current[best] -= sum;
    out.push(valid[best].id);
  }
  return out;
}
