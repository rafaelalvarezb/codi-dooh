import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/app/Page";
import { requireOrgViewer } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Campañas · CODI·DOOH" };

export default async function AdvertiserHome() {
  const viewer = await requireOrgViewer("advertiser", "/anunciantes");
  return (
    <main>
      <PageHeader eyebrow={viewer.org.name} title="Campañas" />
      <div className="mt-8">
        <EmptyState
          title="Aún no tienes campañas"
          body="Sube un video de 6, 10 o 15 segundos y elige en qué pantallas quieres aparecer. En menos de un minuto ya está al aire."
        />
      </div>
    </main>
  );
}
