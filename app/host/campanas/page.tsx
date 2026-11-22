import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/Page";
import { buttonClass } from "@/components/ui/form";
import { CampaignList } from "@/components/campaigns/CampaignViews";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { listCampaigns } from "@/lib/data/campaigns";

export const metadata: Metadata = { title: "Mis anuncios · CODI·DOOH" };

export default async function HostCampaigns() {
  const viewer = await requireOrgViewer("host", "/host/campanas");
  const campaigns = await listCampaigns(orgCtx(viewer), { mode: "house" });
  return (
    <main>
      <PageHeader
        eyebrow={viewer.org.name}
        title="Mis anuncios"
        description="Anuncios propios o de negocios que tú consigas, en tus pantallas y sin costo."
        actions={
          campaigns.length ? (
            <Link href="/host/campanas/nueva" className={buttonClass()}>
              Nuevo anuncio
            </Link>
          ) : null
        }
      />
      <div className="mt-8">
        <CampaignList
          campaigns={campaigns}
          basePath="/host/campanas"
          newHref="/host/campanas/nueva"
          emptyTitle="Aún no tienes anuncios propios"
          emptyBody="Promociona tu negocio o el de un vecino en tus pantallas. No tiene costo."
        />
      </div>
    </main>
  );
}
