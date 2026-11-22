import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { Thumb } from "@/components/campaigns/CampaignWizard";
import { StatePill } from "@/components/campaigns/CampaignViews";
import { CampaignAdminControls } from "@/components/admin/AdminActions";
import { requireViewer } from "@/lib/auth/dal";
import { listAllCampaigns } from "@/lib/data/admin";
import { formatMxn } from "@/lib/pricing";

export const metadata: Metadata = { title: "Campañas · Admin · CODI·DOOH", robots: { index: false } };

function shortDate(d: Date) {
  return d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short" });
}

const BILLING = { paid: "Pagada", pilot: "Piloto", house: "Propia del host" } as const;

export default async function Page() {
  await requireViewer("admin", "/admin/campanas");
  const items = await listAllCampaigns();
  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="Campañas"
        description="Marca una campaña como piloto para que no se le cobre al anunciante. Su valor de mercado se sigue mostrando."
      />
      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState title="Aún no hay campañas" body="Cuando alguien publique una, aparecerá aquí." />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-[var(--cd-line)]">
              {items.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5">
                  <Thumb src={c.blobUrl} poster={c.posterUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[length:var(--cd-body)] font-medium">{c.name}</span>
                      <StatePill state={c.state} />
                      {c.isDemo ? <DemoBadge /> : null}
                    </p>
                    <p className="truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                      {c.orgName} · {shortDate(c.startsAt)} – {shortDate(c.endsAt)} · {c.screenCount}{" "}
                      {c.screenCount === 1 ? "pantalla" : "pantallas"} · {BILLING[c.billing]}
                      {c.billing === "house" ? "" : ` · ${formatMxn(c.marketValueCents, { decimals: false })}`}
                    </p>
                  </div>
                  {c.state !== "ended" ? (
                    <CampaignAdminControls id={c.id} billing={c.billing} paused={c.status === "paused"} />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
