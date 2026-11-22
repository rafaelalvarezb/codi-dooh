/** Server views shared by /anunciantes/campanas/* and /host/campanas/*. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Stat } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { PauseToggle } from "@/components/campaigns/CampaignActions";
import { StatePill } from "@/components/campaigns/CampaignViews";
import { KioskPreview } from "@/components/dooh/KioskPreview";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { campaignState, getCampaign } from "@/lib/data/campaigns";
import { NotFoundError } from "@/lib/data/context";
import { listCreatives } from "@/lib/data/creatives";
import { listMarketplaceScreens, listOwnScreens } from "@/lib/data/screens";
import { billedCents, formatMxn } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { storageMode } from "@/lib/storage";

type Mode = "advertiser" | "house";

const AREA = { advertiser: "advertiser", house: "host" } as const;
const BASE = { advertiser: "/anunciantes/campanas", house: "/host/campanas" } as const;
const LIST = { advertiser: "/anunciantes", house: "/host/campanas" } as const;

export async function NewCampaignView({ mode }: { mode: Mode }) {
  const viewer = await requireOrgViewer(AREA[mode], `${BASE[mode]}/nueva`);
  const ctx = orgCtx(viewer);
  const [screens, creatives, settings] = await Promise.all([
    mode === "house" ? listOwnScreens(ctx) : listMarketplaceScreens(),
    listCreatives(ctx),
    getSettings(),
  ]);
  return (
    <main>
      <PageHeader
        eyebrow={viewer.org.name}
        title={mode === "house" ? "Nuevo anuncio propio" : "Nueva campaña"}
        description={
          mode === "house"
            ? "Anuncia tu negocio o el de un vecino en tus propias pantallas."
            : "En cinco pasos tu video entra a la rotación de las pantallas."
        }
      />
      <CampaignWizard
        mode={mode}
        orgId={viewer.org.id}
        uploadMode={storageMode()}
        spotPriceCents={settings.defaultSpotPriceCents}
        basePath={BASE[mode]}
        screens={screens.map((s) => ({
          id: s.id,
          name: s.name,
          siteName: s.siteName,
          siteAddress: s.siteAddress,
          hostName: s.hostName,
          isDemo: s.isDemo,
          spotPriceCents: s.spotPriceCents,
        }))}
        library={creatives
          .filter((c) => c.status === "active")
          .map((c) => ({
            id: c.id,
            label: c.label,
            src: c.blobUrl,
            poster: c.posterUrl,
            fitMode: c.fitMode,
            durationMs: c.durationMs,
            width: c.width,
            height: c.height,
          }))}
      />
    </main>
  );
}

function longDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export async function CampaignDetailView({
  mode,
  id,
  justPublished,
  children,
}: {
  mode: Mode;
  id: string;
  justPublished: boolean;
  children?: React.ReactNode;
}) {
  const viewer = await requireOrgViewer(AREA[mode], `${BASE[mode]}/${id}`);
  let campaign;
  try {
    campaign = await getCampaign(orgCtx(viewer), id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const state = campaignState(campaign, campaign.creative.status);
  const billed = billedCents(campaign.billing, campaign.marketValueCents);

  return (
    <main>
      <Link href={LIST[mode]} className="text-[length:var(--cd-small)] text-[var(--cd-muted)] hover:text-[var(--cd-ink)]">
        ← Campañas
      </Link>
      <div className="mt-3">
        <PageHeader
          title={campaign.name}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <StatePill state={state} />
              {campaign.isDemo ? <DemoBadge /> : null}
              <span className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                {longDate(campaign.startsAt)} – {longDate(campaign.endsAt)}
              </span>
            </span>
          }
          actions={
            state !== "ended" && state !== "blocked" ? (
              <PauseToggle campaignId={campaign.id} paused={campaign.status === "paused"} />
            ) : null
          }
        />
      </div>

      {justPublished ? (
        <p
          role="status"
          className="mt-6 rounded-[var(--cd-radius-md)] bg-[var(--cd-success-soft)] px-4 py-3 text-[length:var(--cd-small)] text-[var(--cd-success)]"
        >
          Tu campaña ya está publicada. Entra a la rotación de las pantallas en menos de un minuto.
        </p>
      ) : null}
      {state === "blocked" ? (
        <p className="mt-6 rounded-[var(--cd-radius-md)] bg-[var(--cd-danger-soft)] px-4 py-3 text-[length:var(--cd-small)] text-[var(--cd-danger)]">
          Pausamos este video para revisarlo. No se está mostrando en las pantallas.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {children ?? (
            <Card className="px-6 py-10 text-center">
              <p className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Aquí verás tus resultados</p>
              <p className="mx-auto mt-2 max-w-md text-[length:var(--cd-body)] text-[var(--cd-muted)]">
                Reproducciones, minutos en pantalla y pagos hechos mientras corría tu anuncio.
              </p>
            </Card>
          )}
        </div>
        <aside className="space-y-4">
          <KioskPreview
            src={campaign.creative.blobUrl}
            poster={campaign.creative.posterUrl}
            fitMode={campaign.creative.fitMode}
            showSafeZone={false}
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label={campaign.billing === "paid" ? "Total" : campaign.billing === "pilot" ? "Valor de mercado" : "Costo"}
              value={campaign.billing === "house" ? "Sin costo" : formatMxn(campaign.billing === "paid" ? billed : campaign.marketValueCents, { decimals: false })}
              hint={campaign.billing === "pilot" ? "Piloto · sin costo para ti" : campaign.billing === "paid" ? "Por pagar" : undefined}
            />
            <Stat label="Pantallas" value={String(campaign.screens.length)} />
          </div>
          <Card>
            <ul className="divide-y divide-[var(--cd-line)] text-[length:var(--cd-small)]">
              {campaign.screens.map((s) => (
                <li key={s.screenId} className="flex justify-between gap-3 px-4 py-2.5">
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 text-[var(--cd-muted)] tabular-nums">
                    {s.spots} {s.spots === 1 ? "spot" : "spots"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </main>
  );
}
