import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Section } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { ScreenStatus } from "@/components/analytics/HostDashboard";
import { relativeTime } from "@/components/analytics/format";
import { KioskLinkCard } from "@/components/host/KioskLinkCard";
import { AcceptsAdsToggle, DailyPayersForm } from "@/components/host/ScreenActions";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { NotFoundError } from "@/lib/data/context";
import { getHostScreen } from "@/lib/data/host";
import { SCREEN_ID } from "@/lib/data/host-schemas";
import { PROFILE_LABEL, SITE_KIND_LABEL } from "@/lib/host-catalog";

export const metadata: Metadata = { title: "Pantalla · cobten" };

export default async function Page({ params, searchParams }: PageProps<"/host/pantallas/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await requireOrgViewer("host", `/host/pantallas/${id}`);
  if (!SCREEN_ID.test(id)) notFound();
  const now = new Date();
  let screen;
  try {
    screen = await getHostScreen(orgCtx(viewer), id, now);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <main className="mx-auto max-w-3xl">
      <Link href="/host/pantallas" className="text-[length:var(--cd-small)] text-[var(--cd-muted)] hover:text-[var(--cd-ink)]">
        ← Pantallas
      </Link>
      <div className="mt-3">
        <PageHeader
          title={screen.name}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--cd-small)]">
              <ScreenStatus status={screen.status} />
              <span className="text-[var(--cd-muted)]">
                {screen.lastSeenAt ? `Última señal: ${relativeTime(screen.lastSeenAt, now).toLowerCase()}` : "Todavía no se conecta"}
              </span>
              {screen.isDemo ? <DemoBadge /> : null}
            </span>
          }
        />
      </div>

      {sp.nueva === "1" ? (
        <p role="status" className="mt-6 rounded-[var(--cd-radius-md)] bg-[var(--cd-success-soft)] px-4 py-3 text-[length:var(--cd-small)] text-[var(--cd-success)]">
          Tu pantalla está creada. Abre este link en la tableta del kiosco para conectarla.
        </p>
      ) : null}

      <div className="mt-6">
        <KioskLinkCard screen={screen} />
      </div>

      <Section title="Configuración">
        <Card className="divide-y divide-[var(--cd-line)]">
          <div className="px-5 py-4">
            <AcceptsAdsToggle screenId={screen.id} acceptsAds={screen.acceptsAds} />
            <p className="mt-1 pl-7 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
              {screen.acceptsAds
                ? "Las marcas pueden elegir esta pantalla. Las campañas que ya están al aire siguen hasta terminar."
                : "Las marcas no pueden elegir esta pantalla. Tus anuncios propios sí se muestran."}
            </p>
          </div>
          <div className="px-5 py-4">
            <DailyPayersForm screenId={screen.id} dailyPayers={screen.dailyPayers} />
            <p className="mt-2 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
              Con este número estimamos a cuántas personas llega un anuncio en esta pantalla. Si no lo sabes, déjalo vacío y
              usamos 300.
            </p>
          </div>
          <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-[length:var(--cd-small)] sm:grid-cols-2">
            <div>
              <dt className="text-[var(--cd-muted)]">Sitio</dt>
              <dd className="mt-0.5">{screen.site?.name ?? "Sin sitio"}</dd>
              {screen.site ? (
                <dd className="text-[var(--cd-muted)]">
                  {[SITE_KIND_LABEL[screen.site.kind], screen.site.address].filter(Boolean).join(" · ")}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-[var(--cd-muted)]">Cobro</dt>
              <dd className="mt-0.5">{PROFILE_LABEL[screen.profile].title}</dd>
              <dd className="text-[var(--cd-muted)]">{PROFILE_LABEL[screen.profile].body}</dd>
            </div>
          </dl>
        </Card>
      </Section>
    </main>
  );
}
