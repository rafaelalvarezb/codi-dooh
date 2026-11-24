import { Card, Stat } from "@/components/app/Page";
import { ColumnChart } from "@/components/charts/ColumnChart";
import type { CampaignAnalytics } from "@/lib/data/analytics";
import { formatMxn } from "@/lib/pricing";
import { dayColumns, formatAirtime, formatCount, hourColumns, plural, relativeTime, tickEvery } from "./format";

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="px-4 pt-4 pb-3 sm:px-5">
      <h3 className="text-[length:var(--cd-body)] font-medium">{title}</h3>
      {description ? <p className="mt-0.5 text-[length:var(--cd-small)] text-[var(--cd-muted)]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function HowAttentionWorks() {
  return (
    <details className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">
      <summary className="cursor-pointer select-none hover:text-[var(--cd-ink)]">¿Cómo se cuenta un pago durante tu anuncio?</summary>
      <p className="mt-2 max-w-prose">
        Contamos un pago cuando alguien pagó con CoDi en la misma pantalla mientras tu anuncio estaba al aire: desde que
        se generó su código QR hasta que se confirmó el pago. Cada pago cuenta una sola vez por campaña. Si el código
        estuvo abierto más de 15 minutos, solo tomamos en cuenta los últimos 15.
      </p>
    </details>
  );
}

/** Results block on the campaign detail page (advertiser and house ads). */
export function CampaignResults({ a, now }: { a: CampaignAnalytics; now: Date }) {
  if (a.plays === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <p className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Aún no hay reproducciones</p>
        <p className="mx-auto mt-2 max-w-md text-[length:var(--cd-body)] text-[var(--cd-muted)]">
          En cuanto una pantalla pase tu anuncio, aquí verás cuántas veces salió, en qué horarios y cuántas personas
          pagaron mientras corría. Recarga la página para ver lo más reciente.
        </p>
      </Card>
    );
  }

  const isHouse = a.billing === "house";
  const costHint = a.billing === "pilot" ? "Valor de mercado a la fecha" : "A la fecha";

  return (
    <div className="space-y-4">
      {/* Hero: verified attention */}
      <Card className="px-5 py-5 sm:px-6">
        <p className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">Pagos durante tu anuncio</p>
        <p className="mt-1 text-[48px] leading-none font-medium tracking-[-0.03em] sm:text-[length:var(--cd-amount)]">
          {formatCount(a.attendedPayments)}
        </p>
        <p className="mt-2 max-w-prose text-[length:var(--cd-body)] text-[var(--cd-ink-2)]">
          {a.attendedPayments === 0
            ? "Todavía nadie ha pagado con CoDi mientras corría tu anuncio. Cada pago confirmado en la pantalla aparecerá aquí."
            : `${a.attendedPayments === 1 ? "Persona que pagó" : "Personas que pagaron"} con CoDi frente a la pantalla mientras corría tu anuncio, por ${formatMxn(a.attendedAmountCents)} en total.`}
        </p>
        <div className="mt-3">
          <HowAttentionWorks />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Reproducciones" value={formatCount(a.plays)} hint={`Última: ${relativeTime(a.lastPlayAt, now).toLowerCase()}`} />
        <Stat label="Tiempo en pantalla" value={formatAirtime(a.airtimeMs)} />
        <Stat
          label="Pantallas con reproducciones"
          value={`${a.screensWithPlays} de ${a.screensBooked}`}
          hint={plural(a.sitesWithPlays, "sitio", "sitios")}
        />
        {!isHouse ? (
          <>
            <Stat
              label="Costo por reproducción"
              value={a.costPerPlayCents != null ? formatMxn(a.costPerPlayCents) : "—"}
              hint={costHint}
            />
            <Stat
              label="Costo por pago atendido"
              value={a.costPerAttendedPaymentCents != null ? formatMxn(a.costPerAttendedPaymentCents) : "—"}
              hint={a.costPerAttendedPaymentCents != null ? costHint : "Sin pagos todavía"}
            />
            <Stat label={a.billing === "pilot" ? "Valor a la fecha" : "Costo a la fecha"} value={formatMxn(a.toDateCents, { decimals: false })} hint={`de ${formatMxn(a.totalCents, { decimals: false })}`} />
          </>
        ) : null}
      </div>

      {a.byDay.length > 1 ? (
        <ChartCard title="Reproducciones por día" description="Hora de la Ciudad de México.">
          <ColumnChart data={dayColumns(a.byDay)} title="Reproducciones por día" unit={["reproducción", "reproducciones"]} tickEvery={tickEvery(a.byDay.length)} />
        </ChartCard>
      ) : null}

      <ChartCard title="Reproducciones por hora del día" description="Suma de toda la campaña. Hora de la Ciudad de México.">
        <ColumnChart data={hourColumns(a.byHour)} title="Reproducciones por hora del día" unit={["reproducción", "reproducciones"]} tickEvery={3} />
      </ChartCard>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <h3 className="text-[length:var(--cd-body)] font-medium">Por pantalla</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[length:var(--cd-small)]">
            <thead className="align-bottom text-[var(--cd-muted)]">
              <tr className="border-b border-[var(--cd-line)]">
                <th className="px-4 py-2 font-normal sm:px-5">Pantalla</th>
                <th className="px-3 py-2 text-right font-normal">Spots</th>
                <th className="px-3 py-2 text-right font-normal">Reproducciones</th>
                <th className="px-4 py-2 text-right font-normal sm:px-5">Pagos durante tu anuncio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cd-line)]">
              {a.byScreen.map((s) => (
                <tr key={s.screenId}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="block font-medium">{s.name}</span>
                    {s.siteName ? <span className="block text-[var(--cd-muted)]">{s.siteName}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{s.spots}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(s.plays)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">{formatCount(s.attendedPayments)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
