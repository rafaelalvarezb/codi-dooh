import type { Metadata } from "next";
import { Card, PageHeader, Section } from "@/components/app/Page";
import { BusinessForm, ClabeForm } from "@/components/host/HostForms";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { getHostOrg } from "@/lib/data/host";

export const metadata: Metadata = { title: "Datos de tu negocio · cobten" };

export default async function Page() {
  const viewer = await requireOrgViewer("host", "/host/cuenta");
  const org = await getHostOrg(orgCtx(viewer));
  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader eyebrow={viewer.org.name} title="Datos de tu negocio" />
      <Section title="Negocio">
        <Card className="px-5 py-6 sm:px-7">
          <BusinessForm defaults={{ name: org.name, legalName: org.legalName ?? "" }} submitLabel="Guardar" />
        </Card>
      </Section>
      <Section title="Cuenta para tus pagos" description="Aquí depositamos lo que ganes con anuncios.">
        <Card className="px-5 py-6 sm:px-7">
          <ClabeForm defaults={{ clabe: org.clabe ?? "", holder: org.clabeHolder ?? org.legalName ?? "" }} submitLabel="Guardar" />
        </Card>
      </Section>
    </main>
  );
}
