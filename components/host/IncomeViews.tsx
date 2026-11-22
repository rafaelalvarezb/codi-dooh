import Link from "next/link";
import { Card, Stat } from "@/components/app/Page";
import type { HostIncome } from "@/lib/data/host";
import { CLABE_BANKS, maskClabe } from "@/lib/clabe";
import { formatMxn } from "@/lib/pricing";

const monthFmt = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long" });
const monthYearFmt = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "short", year: "numeric" });

export function monthName(year: number, month: number, withYear = false) {
  const d = new Date(Date.UTC(year, month - 1, 15));
  return (withYear ? monthYearFmt : monthFmt).format(d);
}

export function payDateLabel(d: Date) {
  return d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long" });
}

function pct(bps: number) {
  return `${(bps / 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;
}

/** Next payout, the number a host cares about most. */
export function PayoutHero({ income }: { income: HostIncome }) {
  const p = income.payout;
  const bank = income.bankCode ? CLABE_BANKS[income.bankCode] : null;
  return (
    <Card className="px-5 py-5 sm:px-6">
      <p className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">Próximo pago · {payDateLabel(p.payDate)}</p>
      <p className="mt-1 text-[48px] leading-none font-medium tracking-[-0.03em] sm:text-[length:var(--cd-amount)]">
        {formatMxn(p.hostCents)}
      </p>
      <p className="mt-2 max-w-prose text-[length:var(--cd-body)] text-[var(--cd-ink-2)]">
        {p.closed
          ? `Tu parte de ${monthName(p.year, p.month)}, ya cerrado.`
          : `Tu parte de lo que llevas en ${monthName(p.year, p.month)}. Sigue sumando hasta fin de mes.`}
      </p>
      {income.clabe ? (
        <p className="mt-3 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
          A tu CLABE {bank ? `${bank} ` : ""}
          <span className="font-mono">{maskClabe(income.clabe)}</span>
          {income.clabeHolder ? ` · ${income.clabeHolder}` : ""} ·{" "}
          <Link href="/host/cuenta" className="underline underline-offset-4 hover:text-[var(--cd-ink)]">
            Cambiar
          </Link>
        </p>
      ) : (
        <p className="mt-3 rounded-[var(--cd-radius-sm)] bg-[var(--cd-danger-soft)] px-3 py-2 text-[length:var(--cd-small)] text-[var(--cd-danger)]">
          Agrega tu CLABE para poder pagarte.{" "}
          <Link href="/host/cuenta" className="font-medium underline underline-offset-4">
            Agregar CLABE
          </Link>
        </p>
      )}
    </Card>
  );
}

export function IncomeStats({ income }: { income: HostIncome }) {
  const c = income.current;
  const hostBps = 10_000 - income.commissionBps;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Anuncios vendidos este mes" value={formatMxn(c.grossCents)} hint="Ingreso bruto en tus pantallas" />
      <Stat label={`Tu parte (${pct(hostBps)})`} value={formatMxn(c.hostCents)} />
      <Stat label={`Comisión CODI·DOOH (${pct(income.commissionBps)})`} value={formatMxn(c.platformCents)} />
      <Stat label="Valor de pilotos" value={formatMxn(c.pilotValueCents)} hint="Campañas piloto. No generan ingreso." />
    </div>
  );
}

export function LedgerTable({ income }: { income: HostIncome }) {
  const rows = [...income.months].reverse();
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[length:var(--cd-small)]">
          <thead className="align-bottom text-[var(--cd-muted)]">
            <tr className="border-b border-[var(--cd-line)]">
              <th className="px-4 py-2 font-normal sm:px-5">Mes</th>
              <th className="px-3 py-2 text-right font-normal">Bruto</th>
              <th className="px-3 py-2 text-right font-normal">Comisión</th>
              <th className="px-3 py-2 text-right font-normal">Tu parte</th>
              <th className="px-4 py-2 text-right font-normal sm:px-5">Pilotos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cd-line)]">
            {rows.map((m, i) => (
              <tr key={`${m.year}-${m.month}`}>
                <td className="px-4 py-2.5 whitespace-nowrap first-letter:uppercase sm:px-5">
                  {monthName(m.year, m.month, true).replace(".", "")}
                  {i === 0 ? <span className="block text-[length:var(--cd-label)] text-[var(--cd-muted)]">En curso</span> : null}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMxn(m.grossCents)}</td>
                <td className="px-3 py-2.5 text-right text-[var(--cd-muted)] tabular-nums">{formatMxn(m.platformCents)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMxn(m.hostCents)}</td>
                <td className="px-4 py-2.5 text-right text-[var(--cd-muted)] tabular-nums sm:px-5">{formatMxn(m.pilotValueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function IncomeByScreen({ income }: { income: HostIncome }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-[length:var(--cd-small)]">
        <thead className="text-[var(--cd-muted)]">
          <tr className="border-b border-[var(--cd-line)]">
            <th className="px-4 py-2 font-normal sm:px-5">Pantalla</th>
            <th className="px-3 py-2 text-right font-normal">Bruto</th>
            <th className="px-4 py-2 text-right font-normal sm:px-5">Tu parte</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--cd-line)]">
          {income.byScreen.map((s) => (
            <tr key={s.screenId}>
              <td className="px-4 py-2.5 sm:px-5">
                <Link href={`/host/pantallas/${s.screenId}`} className="font-medium hover:underline">
                  {s.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatMxn(s.grossCents)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">{formatMxn(s.hostCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
