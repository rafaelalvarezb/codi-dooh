import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/app/Page";
import { ScreenForm } from "@/components/host/HostForms";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { listSites } from "@/lib/data/host";

export const metadata: Metadata = { title: "Agregar pantalla · cobten" };

export default async function Page() {
  const viewer = await requireOrgViewer("host", "/host/pantallas/nueva");
  const sites = await listSites(orgCtx(viewer));
  return (
    <main className="mx-auto max-w-2xl">
      <Link href="/host/pantallas" className="text-[length:var(--cd-small)] text-[var(--cd-muted)] hover:text-[var(--cd-ink)]">
        ← Pantallas
      </Link>
      <div className="mt-3">
        <PageHeader eyebrow={viewer.org.name} title="Agregar pantalla" />
      </div>
      <Card className="mt-6 px-5 py-6 sm:px-7">
        <ScreenForm sites={sites.map((s) => ({ id: s.id, name: s.name, kind: s.kind }))} allowNewSite />
      </Card>
    </main>
  );
}
