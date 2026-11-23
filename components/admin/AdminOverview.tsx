import Link from "next/link";
import { Card, PageHeader, Section, Stat } from "@/components/app/Page";
import { ScreenStatus } from "@/components/analytics/HostDashboard";
import { formatAirtime, formatCount } from "@/components/analytics/format";
import { SeedButton } from "@/components/admin/AdminActions";
import { DemoFilterToggle } from "@/components/admin/DemoFilterToggle";
import { hideDemo } from "@/lib/demo-filter";
import { monthName } from "@/components/host/IncomeViews";
import { requireViewer } from "@/lib/auth/dal";
import { platformRevenue } from "@/lib/data/admin";
import { platformTotals } from "@/lib/data/analytics";
import { countNewLeads } from "@/lib/data/leads";
import { listMachines } from "@/lib/machines";
import { listPayments, paymentStats } from "@/lib/payment-store";
import { formatMxn } from "@/lib/pricing";
import { kioskPath, screenToken } from "@/lib/screen-token";

/** Payments store amounts in pesos (legacy shape); format them as MXN. */
function pesos(amount: number): string {
  return formatMxn(Math.round(amount * 100));
}

function formatTime(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(bps: number) {
  return `${(bps / 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;
}

/** Platform overview: money, activity, kiosks and recent CoDi payments. */
export async function AdminOverview() {
  await requireViewer("admin");
  const now = new Date();
  const hidden = await hideDemo();
  const includeDemo = !hidden;

  const [allMachines, payments, stats, platform, revenue, newLeads] = await Promise.all([
    listMachines(),
    listPayments(25, { includeDemo }),
    paymentStats({ includeDemo }),
    platformTotals(now, { includeDemo }),
    platformRevenue(now, { includeDemo }),
    countNewLeads(),
  ]);
  const machines = hidden ? allMachines.filter((m) => !m.isDemo) : allMachines;
  const cur = revenue.current;
  const machineName = new Map(allMachines.map((m) => [m.id, m.name]));
  const month = revenue.months[revenue.months.length - 1];

  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="Resumen"
        description={hidden ? "Dinero, actividad y kioscos reales, sin datos de demo." : "Dinero, actividad y kioscos de toda la plataforma, incluidos los datos de demo."}
        actions={<DemoFilterToggle hidden={hidden} />}
      />

      {newLeads > 0 ? (
        <Link
          href="/admin/contactos"
          className="mt-6 flex items-center justify-between gap-3 rounded-[var(--cd-radius-md)] border border-[var(--cd-accent)]/25 bg-[var(--cd-accent-soft)] px-4 py-3 text-[length:var(--cd-small)] text-[var(--cd-ink)] hover:border-[var(--cd-accent)]/50"
        >
          <span>
            <strong className="font-medium">
              {newLeads} {newLeads === 1 ? "solicitud nueva" : "solicitudes nuevas"} de demo
            </strong>{" "}
            desde cobten.com
          </span>
          <span className="text-[var(--cd-accent)]">Ver contactos →</span>
        </Link>
      ) : null}

      <Section title="Dinero" description={`Lo que va de ${monthName(month.year, month.month)}. Cada campaña suma día por día mientras corre.`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Anuncios vendidos" value={formatMxn(cur.grossCents)} hint="Campañas pagadas" />
          <Stat label={`Comisión plataforma (${pct(revenue.commissionBps)})`} value={formatMxn(cur.platformCents)} />
          <Stat label="Para hosts" value={formatMxn(cur.hostCents)} />
          <Stat label="Valor de pilotos" value={formatMxn(cur.pilotValueCents)} hint="Subsidiado, sin ingreso" />
        </div>
      </Section>

      <Section title="Actividad" description={`Últimos ${platform.windowDays} días, todas las organizaciones.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Reproducciones" value={formatCount(platform.plays)} />
          <Stat label="Tiempo con anuncios" value={formatAirtime(platform.airtimeMs)} />
          <Stat label="Pagos durante anuncios" value={formatCount(platform.attendedPayments)} />
          <Stat label="Campañas al aire" value={formatCount(platform.activeCampaigns)} />
          <Stat label="Pantallas en línea" value={`${platform.screensOnline} de ${platform.screens}`} />
          <Stat label="Hosts" value={formatCount(platform.hosts)} />
          <Stat label="Anunciantes" value={formatCount(platform.advertisers)} />
          <Stat label="Cobros CoDi" value={formatCount(platform.payments)} hint={formatMxn(platform.paymentsAmountCents)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Hoy · cobros" value={formatCount(stats.todayCount)} hint={pesos(stats.todayAmount)} />
          <Stat label="Semana · cobros" value={formatCount(stats.weekCount)} hint={pesos(stats.weekAmount)} />
        </div>
      </Section>

      <Section title="Kioscos" description="Abre un kiosco para verlo en vivo. Los kioscos vinculados abren con su clave.">
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--cd-line)]">
            {machines.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[length:var(--cd-body)] font-medium">{m.name}</p>
                  <p className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">{m.location}</p>
                </div>
                <div className="flex items-center gap-4 text-[length:var(--cd-small)]">
                  <ScreenStatus status={m.status} />
                  <Link
                    href={
                      m.tokenVersion != null
                        ? kioskPath({ id: m.id, profile: m.profile }, screenToken(m.id, m.tokenVersion))
                        : m.kioskPath
                    }
                    prefetch={false}
                    target="_blank"
                    className="font-medium text-[var(--cd-accent)]"
                  >
                    Abrir kiosco
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="Cobros CoDi recientes">
        {payments.length === 0 ? (
          <Card className="px-5 py-6 text-[length:var(--cd-body)] text-[var(--cd-muted)]">
            Aún no hay cobros. Genera un QR en un kiosco para verlos aquí.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[length:var(--cd-small)]">
                <thead className="text-[var(--cd-muted)]">
                  <tr className="border-b border-[var(--cd-line)]">
                    <th className="px-4 py-2 font-normal sm:px-5">Hora</th>
                    <th className="px-3 py-2 font-normal">Máquina</th>
                    <th className="px-3 py-2 text-right font-normal">Monto</th>
                    <th className="px-3 py-2 font-normal">Estado</th>
                    <th className="px-4 py-2 font-normal sm:px-5">Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cd-line)]">
                  {payments.map((p) => (
                    <tr key={p.qrId}>
                      <td className="px-4 py-2.5 tabular-nums sm:px-5">{formatTime(p.datePaid ?? p.updatedAt)}</td>
                      <td className="px-3 py-2.5">{p.machineId ? (machineName.get(p.machineId) ?? p.machineId) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{pesos(p.amount ?? 0)}</td>
                      <td className="px-3 py-2.5">{p.status === "PAID" ? "Pagado" : "Pendiente"}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] sm:px-5">{(p.transactionId ?? p.qrId).slice(-10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Section>

      <Section title="Datos de demo" description="Host Plaza Centro con 3 pantallas, Silvertag como piloto y dos semanas de actividad. Todo queda marcado como demo.">
        <SeedButton />
      </Section>
    </main>
  );
}
