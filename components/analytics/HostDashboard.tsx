import { Card, Section, Stat } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { Thumb } from "@/components/campaigns/CampaignWizard";
import type { HostAnalytics } from "@/lib/data/analytics";
import type { MachineStatus } from "@/lib/machines";
import { formatMxn } from "@/lib/pricing";
import { dayColumns, formatAirtime, formatCount, hourColumns, plural, relativeTime, tickEvery } from "./format";

const STATUS: Record<MachineStatus, { label: string; dot: string }> = {
  online: { label: "En línea", dot: "bg-[var(--cd-success)]" },
  offline: { label: "Sin conexión", dot: "bg-[var(--cd-danger)]" },
  unknown: { label: "Sin conectar aún", dot: "bg-[var(--cd-subtle)]" },
};

export function ScreenStatus({ status }: { status: MachineStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

const BILLING_LABEL = { paid: "Anunciante", pilot: "Piloto", house: "Propio" } as const;

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="px-4 pt-4 pb-3 sm:px-5">
      <h3 className="text-[length:var(--cd-body)] font-medium">{title}</h3>
      {description ? <p className="mt-0.5 text-[length:var(--cd-small)] text-[var(--cd-muted)]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function HostDashboard({ h, now }: { h: NonNullable<HostAnalytics>; now: Date }) {
  const days = dayColumns(h.playsByDay);
  const every = tickEvery(days.length);
  return (
    <>
      <Section title="Actividad" description={`Últimos ${h.windowDays} días, en todas tus pantallas.`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Reproducciones de anuncios" value={formatCount(h.plays)} />
          <Stat label="Tiempo con anuncios" value={formatAirtime(h.airtimeMs)} />
          <Stat label="Cobros con CoDi" value={formatCount(h.payments)} />
          <Stat label="Monto cobrado con CoDi" value={formatMxn(h.paymentsAmountCents)} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Reproducciones por día">
            <ColumnChart data={days} title="Reproducciones por día" unit={["reproducción", "reproducciones"]} tickEvery={every} />
          </ChartCard>
          <ChartCard title="Cobros con CoDi por día">
            <ColumnChart data={dayColumns(h.paymentsByDay)} title="Cobros con CoDi por día" unit={["cobro", "cobros"]} tickEvery={every} />
          </ChartCard>
        </div>
        <div className="mt-4">
          <ChartCard title="Reproducciones por hora del día" description="Hora de la Ciudad de México.">
            <ColumnChart data={hourColumns(h.playsByHour)} title="Reproducciones por hora del día" unit={["reproducción", "reproducciones"]} tickEvery={3} />
          </ChartCard>
        </div>
      </Section>

      <Section title="Pantallas" description={`Datos de los últimos ${h.windowDays} días.`}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[length:var(--cd-small)]">
              <thead className="text-[var(--cd-muted)]">
                <tr className="border-b border-[var(--cd-line)]">
                  <th className="px-4 py-2 font-normal sm:px-5">Pantalla</th>
                  <th className="px-3 py-2 font-normal">Estado</th>
                  <th className="px-3 py-2 text-right font-normal">Reproducciones</th>
                  <th className="px-3 py-2 text-right font-normal">Cobros</th>
                  <th className="px-4 py-2 text-right font-normal sm:px-5">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cd-line)]">
                {h.screens.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 sm:px-5">
                      <span className="flex items-center gap-2 font-medium">
                        {s.name}
                        {s.isDemo ? <DemoBadge /> : null}
                      </span>
                      {s.siteName ? <span className="block text-[var(--cd-muted)]">{s.siteName}</span> : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <ScreenStatus status={s.status} />
                      <span className="block text-[var(--cd-muted)]">
                        {s.lastSeenAt ? relativeTime(s.lastSeenAt, now) : "Sin señal"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(s.plays)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCount(s.payments)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">{formatMxn(s.paymentsAmountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section title="Anuncios al aire en tus pantallas">
        {h.ads.length === 0 ? (
          <Card className="px-5 py-6 text-[length:var(--cd-body)] text-[var(--cd-muted)]">
            Ahora no corre ningún anuncio. Mientras tanto, tus pantallas pasan los videos de cobten.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-[var(--cd-line)]">
              {h.ads.map((ad) => (
                <li key={ad.campaignId} className="flex items-center gap-4 px-4 py-3">
                  <Thumb src={ad.blobUrl} poster={ad.posterUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-[length:var(--cd-body)] font-medium">{ad.advertiser}</span>
                      {ad.isDemo ? <DemoBadge /> : null}
                    </p>
                    <p className="truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                      {ad.name} · {plural(ad.screens, "pantalla", "pantallas")} · {plural(ad.spots ?? 0, "spot", "spots")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-[var(--cd-radius-pill)] bg-[var(--cd-surface)] px-2.5 py-1 text-[length:var(--cd-label)] text-[var(--cd-ink-2)]">
                    {BILLING_LABEL[ad.billing]}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>
    </>
  );
}
