import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/app/Page";
import { LeadStatusButton } from "@/components/admin/AdminActions";
import { requireViewer } from "@/lib/auth/dal";
import { listLeads } from "@/lib/data/leads";

export const metadata: Metadata = { title: "Contactos · Admin · cobten", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatPhone(p: string) {
  return p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 6)} ${p.slice(6)}` : p;
}

export default async function Page() {
  await requireViewer("admin", "/admin/contactos");
  const leads = await listLeads();
  const fresh = leads.filter((l) => l.status === "new").length;
  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="Contactos"
        description={
          fresh > 0
            ? `${fresh} ${fresh === 1 ? "solicitud nueva" : "solicitudes nuevas"} de demo desde cobten.com.`
            : "Solicitudes de demo que llegan desde el formulario de cobten.com."
        }
      />
      {leads.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Aún no hay solicitudes"
            body="Cuando alguien llene “Agenda una demo” en cobten.com, aparecerá aquí con su teléfono para que le llames."
          />
        </div>
      ) : (
        <Card className="mt-8 overflow-hidden">
          <ul className="divide-y divide-[var(--cd-line)]">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-[length:var(--cd-body)] font-medium">{l.business}</span>
                    {l.status === "new" ? (
                      <span className="rounded-[var(--cd-radius-pill)] bg-[var(--cd-accent-soft)] px-2 py-0.5 text-[length:var(--cd-label)] text-[var(--cd-accent)]">
                        Nuevo
                      </span>
                    ) : (
                      <span className="rounded-[var(--cd-radius-pill)] bg-[var(--cd-surface)] px-2 py-0.5 text-[length:var(--cd-label)] text-[var(--cd-ink-2)]">
                        Contactado
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[length:var(--cd-small)] text-[var(--cd-ink-2)]">
                    {l.name} ·{" "}
                    <a className="text-[var(--cd-accent)] hover:underline" href={`tel:+52${l.phone}`}>
                      {formatPhone(l.phone)}
                    </a>
                    {l.email ? (
                      <>
                        {" · "}
                        <a className="text-[var(--cd-accent)] hover:underline" href={`mailto:${l.email}`}>
                          {l.email}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                    {[l.city, l.spaces ? `${l.spaces.toLocaleString("es-MX")} cajones` : null, dateFmt.format(l.createdAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {l.message ? (
                    <p className="mt-2 max-w-2xl text-[length:var(--cd-small)] whitespace-pre-line text-[var(--cd-ink-2)]">
                      {l.message}
                    </p>
                  ) : null}
                </div>
                <LeadStatusButton id={l.id} status={l.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
