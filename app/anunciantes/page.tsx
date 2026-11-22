import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/Page";
import { buttonClass } from "@/components/ui/form";
import { CampaignList } from "@/components/campaigns/CampaignViews";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { listCampaigns } from "@/lib/data/campaigns";

export const metadata: Metadata = { title: "Campañas · CODI·DOOH" };

export default async function AdvertiserHome() {
  const viewer = await requireOrgViewer("advertiser", "/anunciantes");
  const campaigns = await listCampaigns(orgCtx(viewer), { mode: "advertiser" });
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
      <div className="mt-8">
        <CampaignList
          campaigns={campaigns}
          basePath="/anunciantes/campanas"
          newHref="/anunciantes/campanas/nueva"
          emptyTitle="Aún no tienes campañas"
          emptyBody="Sube un video de 6, 10 o 15 segundos y elige en qué pantallas quieres aparecer. En menos de un minuto ya está al aire."
        />
      </div>
    </main>
  );
}
