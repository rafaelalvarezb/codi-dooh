import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/app/Page";
import { IncomeByScreen, IncomeStats, LedgerTable, PayoutHero } from "@/components/host/IncomeViews";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { hostIncome } from "@/lib/data/host";

export const metadata: Metadata = { title: "Ingresos · cobten" };

export default async function Page() {
  const viewer = await requireOrgViewer("host", "/host/ingresos");
  const income = await hostIncome(orgCtx(viewer), new Date());
  return (
    <main>
      <PageHeader
        eyebrow={viewer.org.name}
        title="Ingresos"
        description={`Lo que ganas por los anuncios que las marcas compran en tus pantallas. Te pagamos el día ${income.payoutDay} de cada mes lo del mes anterior.`}
      />
      <div className="mt-8">
        <PayoutHero income={income} />
      </div>
      <Section title="Este mes">
        <IncomeStats income={income} />
      </Section>
      <Section title="Por mes" description="Cada campaña se reparte día por día entre los meses en que corre.">
        <LedgerTable income={income} />
      </Section>
      {income.byScreen.length ? (
        <Section title="Por pantalla" description="Este mes.">
          <IncomeByScreen income={income} />
        </Section>
      ) : null}
      <p className="mt-10 max-w-prose text-[length:var(--cd-small)] text-[var(--cd-muted)]">
        Estos montos son la cuenta de lo que ganas. Por ahora el depósito a tu CLABE lo hacemos fuera de la plataforma.
      </p>
    </main>
  );
}
