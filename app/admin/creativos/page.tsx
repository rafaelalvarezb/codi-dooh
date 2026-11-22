import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { Thumb } from "@/components/campaigns/CampaignWizard";
import { CreativeModeration } from "@/components/admin/AdminActions";
import { requireViewer } from "@/lib/auth/dal";
import { listAllCreatives } from "@/lib/data/admin";
import { DemoFilterToggle } from "@/components/admin/DemoFilterToggle";
import { hideDemo } from "@/lib/demo-filter";

export const metadata: Metadata = { title: "Videos · Admin · CODI·DOOH", robots: { index: false } };

const STATUS = {
  active: { label: "Activo", cls: "bg-[var(--cd-success-soft)] text-[var(--cd-success)]" },
  paused: { label: "Pausado", cls: "bg-[var(--cd-surface)] text-[var(--cd-ink-2)]" },
  rejected: { label: "Rechazado", cls: "bg-[var(--cd-danger-soft)] text-[var(--cd-danger)]" },
} as const;

function seconds(ms: number) {
  return `${Math.round(ms / 1000)} s`;
}

export default async function Page() {
  await requireViewer("admin", "/admin/creativos");
  const hidden = await hideDemo();
  const items = await listAllCreatives({ includeDemo: !hidden });
  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="Videos"
        actions={<DemoFilterToggle hidden={hidden} />}
        description="Todo video se publica al instante. Si pausas o rechazas uno, sale de todos los kioscos en alrededor de un minuto, en cuanto termine el video que esté pasando. El anunciante ve el motivo."
      />
      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState title="Aún no hay videos" body="Cuando un anunciante suba uno, aparecerá aquí." />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-[var(--cd-line)]">
              {items.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5">
                  <a href={c.blobUrl} target="_blank" rel="noreferrer" aria-label={`Ver ${c.label}`}>
                    <Thumb src={c.blobUrl} poster={c.posterUrl} />
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[length:var(--cd-body)] font-medium">{c.label}</span>
                      <span className={`rounded-[var(--cd-radius-pill)] px-2 py-0.5 text-[length:var(--cd-label)] font-medium ${STATUS[c.status].cls}`}>
                        {STATUS[c.status].label}
                      </span>
                      {c.isDemo ? <DemoBadge /> : null}
                    </p>
                    <p className="truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                      {c.orgName} · {c.width}×{c.height} · {seconds(c.durationMs)} ·{" "}
                      {c.liveCampaigns === 0 ? "Sin campañas al aire" : c.liveCampaigns === 1 ? "1 campaña al aire" : `${c.liveCampaigns} campañas al aire`}
                    </p>
                    {c.moderationNote ? (
                      <p className="mt-0.5 text-[length:var(--cd-small)] text-[var(--cd-danger)]">Motivo: {c.moderationNote}</p>
                    ) : null}
                  </div>
                  <CreativeModeration id={c.id} status={c.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
