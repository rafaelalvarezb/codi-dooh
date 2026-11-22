import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/app/Page";
import { requireOrgViewer } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Mis anuncios · CODI·DOOH" };

export default async function Page() {
  const viewer = await requireOrgViewer("host", "/host/campanas");
  return (
    <main>
      <PageHeader eyebrow={viewer.org.name} title="Mis anuncios" />
      <div className="mt-8">
        <EmptyState title="Muy pronto" body="Esta sección se activa en la siguiente fase." />
      </div>
    </main>
  );
}
