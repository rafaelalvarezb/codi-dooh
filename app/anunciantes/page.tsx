import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Stat } from "@/components/app/Page";
import { formatAirtime, formatCount } from "@/components/analytics/format";
import { buttonClass } from "@/components/ui/form";
import { CampaignList } from "@/components/campaigns/CampaignViews";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { listCampaigns } from "@/lib/data/campaigns";
import { advertiserTotals } from "@/lib/data/analytics";

export const metadata: Metadata = { title: "Campañas · cobten" };

export default async function AdvertiserHome() {
  const viewer = await requireOrgViewer("advertiser", "/anunciantes");
  const ctx = orgCtx(viewer);
  const [campaigns, totals] = await Promise.all([listCampaigns(ctx, { mode: "advertiser" }), advertiserTotals(ctx)]);
  return (
    <main>
      <PageHeader
        eyebrow={viewer.org.name}
        title="Campañas"
        actions={
          campaigns.length ? (
            <Link href="/anunciantes/campanas/nueva" className={buttonClass()}>
              Nueva campaña
            </Link>
          ) : null
        }
      />
      {campaigns.length ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Reproducciones" value={formatCount(totals.plays)} />
          <Stat label="Tiempo en pantalla" value={formatAirtime(totals.airtimeMs)} />
          <Stat label="Pantallas" value={formatCount(totals.screens)} hint="Con reproducciones" />
          <Stat label="Pagos durante tus anuncios" value={formatCount(totals.attendedPayments)} hint="Con CoDi, frente a la pantalla" />
        </div>
      ) : null}
      <div className="mt-6">
        <CampaignList
          campaigns={campaigns}
          basePath="/anunciantes/campanas"
          newHref="/anunciantes/campanas/nueva"
          emptyTitle="Aún no tienes campañas"
          emptyBody="Sube un video de 5 a 30 segundos y elige en qué pantallas quieres aparecer. En menos de un minuto ya está al aire."
        />
      </div>
    </main>
  );
}
