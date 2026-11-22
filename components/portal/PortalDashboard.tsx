import Link from "next/link";
import { redirect } from "next/navigation";
import { listMachines } from "@/lib/machines";
import { listPayments, paymentStats } from "@/lib/payment-store";
import { getPortalSession } from "@/lib/portal-auth";
import { PortalLogoutButton } from "@/components/portal/PortalLogoutButton";

function formatMxn(amount: number): string {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function formatTime(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function PortalDashboard() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const [machines, payments, stats] = await Promise.all([
    listMachines(),
    listPayments(40),
    paymentStats(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium tracking-[0.06em] text-[var(--cd-muted)] uppercase">
            CODI-DOOH · Portal
          </p>
          <h1 className="mt-1 text-[28px] font-medium tracking-[-0.03em]">
            Operación
          </h1>
          <p className="mt-1 text-[14px] text-[var(--cd-ink-2)]">
            {session.email}
          </p>
        </div>
        <PortalLogoutButton />
      </header>

      <section className="mt-10">
        <h2 className="text-[18px] font-medium tracking-[-0.02em]">Resumen</h2>
        <p className="mt-1 text-[14px] text-[var(--cd-muted)]">
          Totales del día y la semana (CoDi). Ads / comisión llegan después.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Hoy · cobros" value={String(stats.todayCount)} />
          <Stat label="Hoy · monto" value={formatMxn(stats.todayAmount)} />
          <Stat label="Semana · cobros" value={String(stats.weekCount)} />
          <Stat label="Semana · monto" value={formatMxn(stats.weekAmount)} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[18px] font-medium tracking-[-0.02em]">Máquinas</h2>
        <p className="mt-1 text-[14px] text-[var(--cd-muted)]">
          Kioscos instalados. Abre el perfil para ver la pantalla en vivo.
        </p>
        <ul className="mt-4 divide-y divide-[var(--cd-line)] border-y border-[var(--cd-line)]">
          {machines.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="text-[15px] font-medium">{m.name}</p>
                <p className="text-[13px] text-[var(--cd-muted)]">{m.location}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={m.status} />
                <Link
                  href={m.kioskPath}
                  className="text-[13px] font-medium text-[var(--cd-accent)]"
                >
                  Abrir kiosco
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 mb-16">
        <h2 className="text-[18px] font-medium tracking-[-0.02em]">
          Transacciones CoDi
        </h2>
        <p className="mt-1 text-[14px] text-[var(--cd-muted)]">
          Pagos recientes guardados en la base de datos.
        </p>
        {payments.length === 0 ? (
          <p className="mt-6 text-[14px] text-[var(--cd-subtle)]">
            Aún no hay cobros. Genera un QR en el kiosco para verlos aquí.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--cd-line)] text-[var(--cd-muted)]">
                  <th className="py-2 pr-3 font-medium">Hora</th>
                  <th className="py-2 pr-3 font-medium">Máquina</th>
                  <th className="py-2 pr-3 font-medium">Monto</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 font-medium">Folio</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.qrId} className="border-b border-[var(--cd-line)]">
                    <td className="py-2.5 pr-3 tabular-nums">
                      {formatTime(p.datePaid ?? p.updatedAt)}
                    </td>
                    <td className="py-2.5 pr-3">{p.machineId ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {formatMxn(p.amount ?? 0)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {p.status === "PAID" ? "Pagado" : "Pendiente"}
                    </td>
                    <td className="py-2.5 font-mono text-[12px]">
                      {(p.transactionId ?? p.qrId).slice(-10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--cd-line)] bg-white px-4 py-3">
      <p className="text-[12px] text-[var(--cd-muted)]">{label}</p>
      <p className="mt-1 text-[20px] font-medium tracking-[-0.02em] tabular-nums">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const online = status === "online";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-[12px] font-medium",
        online ? "text-[var(--cd-success)]" : "text-[var(--cd-muted)]",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          online ? "bg-[var(--cd-success)]" : "bg-[var(--cd-subtle)]",
        ].join(" ")}
      />
      {online ? "Online" : status}
    </span>
  );
}
