import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/Page";
import { buttonClass } from "@/components/ui/form";
import { HostDashboard } from "@/components/analytics/HostDashboard";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { hostAnalytics } from "@/lib/data/analytics";
import { hostIncome } from "@/lib/data/host";
import { PayoutHero } from "@/components/host/IncomeViews";

export const metadata: Metadata = { title: "Resumen · CODI·DOOH" };

export default async function HostHome() {
  const viewer = await requireOrgViewer("host", "/host");
  const now = new Date();
  const ctx = orgCtx(viewer);
  const [h, income] = await Promise.all([hostAnalytics(ctx, now), hostIncome(ctx, now)]);
  return (
    <main>
      <PageHeader eyebrow={viewer.org.name} title="Resumen" />
      {h ? (
        <>
          <div className="mt-8">
            <PayoutHero income={income} />
          </div>
          <HostDashboard h={h} now={now} />
        </>
      ) : (
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
      )}
    </main>
  );
}
