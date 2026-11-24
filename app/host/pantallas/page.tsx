import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { buttonClass } from "@/components/ui/form";
import { ScreenStatus } from "@/components/analytics/HostDashboard";
import { relativeTime } from "@/components/analytics/format";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { listHostScreens } from "@/lib/data/host";
import { PROFILE_LABEL } from "@/lib/host-catalog";

export const metadata: Metadata = { title: "Pantallas · cobten" };

export default async function Page() {
  const viewer = await requireOrgViewer("host", "/host/pantallas");
  const now = new Date();
  const screens = await listHostScreens(orgCtx(viewer), now);
  if (screens.length === 0) redirect("/host/bienvenida");

  return (
    <main>
      <PageHeader
        eyebrow={viewer.org.name}
        title="Pantallas"
        description="Abre cada pantalla para ver el link del kiosco y su código QR."
        actions={
          <Link href="/host/pantallas/nueva" className={buttonClass()}>
            Agregar pantalla
          </Link>
        }
      />
      <Card className="mt-8 overflow-hidden">
        <ul className="divide-y divide-[var(--cd-line)]">
          {screens.map((s) => (
            <li key={s.id}>
              <Link href={`/host/pantallas/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-[var(--cd-surface)] sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-[length:var(--cd-body)] font-medium">{s.name}</span>
                    {s.isDemo ? <DemoBadge /> : null}
                  </p>
                  <p className="truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                    {s.siteName ?? "Sin sitio"} · {PROFILE_LABEL[s.profile].title}
                    {s.acceptsAds ? "" : " · Sin anuncios de marcas"}
                  </p>
                </div>
                <div className="text-right text-[length:var(--cd-small)]">
                  <ScreenStatus status={s.status} />
                  <span className="block text-[var(--cd-muted)]">{s.lastSeenAt ? relativeTime(s.lastSeenAt, now) : "Sin señal"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
