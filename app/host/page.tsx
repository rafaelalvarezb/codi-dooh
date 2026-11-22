import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/Page";
import { buttonClass } from "@/components/ui/form";
import { requireOrgViewer } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Resumen · CODI·DOOH" };

export default async function HostHome() {
  const viewer = await requireOrgViewer("host", "/host");
  return (
    <main>
      <PageHeader eyebrow={viewer.org.name} title="Resumen" />
      <div className="mt-8">
        <EmptyState
          title="Da de alta tu primera pantalla"
          body="Registra tu negocio, tu CLABE y tus pantallas para empezar a ganar con anuncios."
          action={
            <Link href="/host/bienvenida" className={buttonClass()}>
              Empezar
            </Link>
          }
        />
      </div>
    </main>
  );
}
