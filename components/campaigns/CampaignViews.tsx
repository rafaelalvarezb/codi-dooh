import Link from "next/link";
import { Card, EmptyState } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { buttonClass } from "@/components/ui/form";
import { Thumb } from "@/components/campaigns/CampaignWizard";
import { campaignState, type CampaignSummary } from "@/lib/data/campaigns";

const STATE_LABEL: Record<ReturnType<typeof campaignState>, string> = {
  active: "Al aire",
  scheduled: "Programada",
  ended: "Terminada",
  paused: "Pausada",
  blocked: "Pausada por revisión",
};

export function StatePill({ state }: { state: ReturnType<typeof campaignState> }) {
  const live = state === "active";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-[var(--cd-radius-pill)] px-2.5 py-1 text-[length:var(--cd-label)] font-medium",
        live
          ? "bg-[var(--cd-success-soft)] text-[var(--cd-success)]"
          : state === "blocked"
            ? "bg-[var(--cd-danger-soft)] text-[var(--cd-danger)]"
            : "bg-[var(--cd-surface)] text-[var(--cd-ink-2)]",
      ].join(" ")}
    >
      {live ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--cd-success)]" /> : null}
      {STATE_LABEL[state]}
    </span>
  );
}

function shortDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function CampaignList({
  campaigns,
  basePath,
  newHref,
  emptyTitle,
  emptyBody,
}: {
  campaigns: CampaignSummary[];
  basePath: string;
  newHref: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (campaigns.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        action={
          <Link href={newHref} className={buttonClass()}>
            Crear campaña
          </Link>
        }
      />
    );
  }
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-[var(--cd-line)]">
        {campaigns.map((c) => {
          const state = campaignState(c, c.creative.status);
          return (
            <li key={c.id}>
              <Link href={`${basePath}/${c.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--cd-surface)]">
                <Thumb src={c.creative.blobUrl} poster={c.creative.posterUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-[length:var(--cd-body)] font-medium">{c.name}</span>
                    {c.isDemo ? <DemoBadge /> : null}
                  </p>
                  <p className="truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                    {shortDate(c.startsAt)} – {shortDate(c.endsAt)} · {c.screenCount}{" "}
                    {c.screenCount === 1 ? "pantalla" : "pantallas"} · {c.playCount.toLocaleString("es-MX")} reproducciones
                  </p>
                </div>
                <StatePill state={state} />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
