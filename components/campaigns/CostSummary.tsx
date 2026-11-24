"use client";

import { campaignDays, campaignMarketValueCents, formatMxn, MONTH_DAYS } from "@/lib/pricing";
import { DEFAULT_DAILY_PAYERS, DWELL_SEC, estimateReach, OPEN_HOURS } from "@/lib/reach";

export type SummaryScreen = { id: string; name: string; spots: number; bookedSpots: number; dailyPayers: number | null };

function count(n: number): string {
  return n.toLocaleString("es-MX");
}

/**
 * What you pay and what you get, visible while choosing screens, spots and
 * dates (not only after publishing). Totals use the same formula as the
 * server (`campaignMarketValueCents`).
 */
export function CostSummary({
  screens,
  spotPriceCents,
  startsAt,
  endsAt,
  adSec,
  free,
}: {
  screens: SummaryScreen[];
  spotPriceCents: number;
  startsAt: Date;
  endsAt: Date;
  adSec: number;
  free: boolean;
}) {
  const days = campaignDays(startsAt, endsAt);
  const total = free ? 0 : campaignMarketValueCents({ spotPriceCents, screens, startsAt, endsAt });
  const reach = estimateReach({
    screens: screens.map((s) => ({ spots: s.spots, otherSpots: s.bookedSpots, dailyPayers: s.dailyPayers })),
    days,
    adSec,
    totalCents: total,
  });

  if (screens.length === 0) {
    return (
      <div className="rounded-[var(--cd-radius-md)] border border-dashed border-[var(--cd-line)] px-4 py-5 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
        Elige al menos una pantalla para ver el precio y lo que obtienes.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--cd-radius-md)] border border-[var(--cd-line)] bg-[var(--cd-bg)] text-[length:var(--cd-small)]">
      <div className="px-4 pt-4">
        <p className="font-medium text-[var(--cd-ink)]">Lo que pagas</p>
        <ul className="mt-2 space-y-2">
          {screens.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[var(--cd-ink-2)]">
                <span className="block truncate">{s.name}</span>
                <span className="text-[length:var(--cd-label)] text-[var(--cd-muted)]">
                  {s.spots} {s.spots === 1 ? "spot" : "spots"} × {days} {days === 1 ? "día" : "días"}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {free ? "—" : formatMxn(Math.round((s.spots * spotPriceCents * days) / MONTH_DAYS))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-[var(--cd-line)] pt-3">
          <span className="font-medium">Total</span>
          <span className="text-[length:var(--cd-headline)] font-medium tabular-nums">{free ? "Sin costo" : formatMxn(total)}</span>
        </div>
        {!free ? (
          <p className="mt-1 text-[length:var(--cd-label)] text-[var(--cd-muted)]">
            {formatMxn(spotPriceCents, { decimals: false })} al mes por spot en cada pantalla. Se agrega a tu saldo por pagar.
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[var(--cd-line)] bg-[var(--cd-surface)] px-4 py-4">
        <p className="font-medium text-[var(--cd-ink)]">
          Lo que obtienes <span className="font-normal text-[var(--cd-muted)]">· estimado</span>
        </p>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="text-[var(--cd-muted)]">Personas frente a tu anuncio</dt>
            <dd className="text-[length:var(--cd-headline)] font-medium tabular-nums">
              {count(reach.peopleRange[0])} – {count(reach.peopleRange[1])}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--cd-muted)]">Reproducciones</dt>
            <dd className="tabular-nums">
              ≈ {count(Math.round((reach.playsRange[0] + reach.playsRange[1]) / 2))}
            </dd>
          </div>
          {reach.costPerPersonCents !== null ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--cd-muted)]">Costo por persona</dt>
              <dd className="tabular-nums">≈ {formatMxn(Math.max(1, Math.round(reach.costPerPersonCents)))}</dd>
            </div>
          ) : null}
        </dl>
        <details className="mt-3 text-[length:var(--cd-label)] text-[var(--cd-muted)]">
          <summary className="cursor-pointer font-medium text-[var(--cd-ink-2)]">¿Cómo lo calculamos?</summary>
          <p className="mt-2 leading-relaxed">
            Cada pantalla pasa los anuncios por turnos durante {OPEN_HOURS} horas al día; tus spots son tus turnos. Una persona
            tarda unos {DWELL_SEC} segundos en pagar frente a la pantalla, así que la contamos si uno de tus turnos cae en ese
            momento. Usamos cuántas personas pagan al día en cada máquina según el estacionamiento (o {DEFAULT_DAILY_PAYERS} si
            aún no lo indica). Es un estimado; en tu campaña verás los números reales.
          </p>
        </details>
      </div>
    </div>
  );
}
