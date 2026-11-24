import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/app/Page";
import { DemoBadge } from "@/components/app/DemoBadge";
import { DeleteOrgButton, OperateAsButton } from "@/components/admin/AdminActions";
import { requireViewer } from "@/lib/auth/dal";
import { listOrgs } from "@/lib/data/admin";
import { DemoFilterToggle } from "@/components/admin/DemoFilterToggle";
import { hideDemo } from "@/lib/demo-filter";

export const metadata: Metadata = { title: "Organizaciones · Admin · cobten", robots: { index: false } };

const KIND = { host: "Host", advertiser: "Anunciante", both: "Host y anunciante" } as const;

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("es-MX")} ${n === 1 ? one : many}`;
}

export default async function Page() {
  const viewer = await requireViewer("admin", "/admin/organizaciones");
  const hidden = await hideDemo();
  const orgs = await listOrgs({ includeDemo: !hidden });
  return (
    <main>
      <PageHeader
        eyebrow="Admin"
        title="Organizaciones"
        actions={<DemoFilterToggle hidden={hidden} />}
        description="“Operar como” te deja ver y hacer todo lo que haría esa cuenta. Para regresar, usa “Volver a admin”."
      />
      <Card className="mt-8 overflow-hidden">
        <ul className="divide-y divide-[var(--cd-line)]">
          {orgs.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[length:var(--cd-body)] font-medium">{o.name}</span>
                  <span className="rounded-[var(--cd-radius-pill)] bg-[var(--cd-surface)] px-2 py-0.5 text-[length:var(--cd-label)] text-[var(--cd-ink-2)]">
                    {KIND[o.kind]}
                  </span>
                  {o.isDemo ? <DemoBadge /> : null}
                  {viewer.org?.id === o.id ? (
                    <span className="text-[length:var(--cd-label)] text-[var(--cd-accent)]">Operando ahora</span>
                  ) : null}
                </p>
                <p className="truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                  {o.ownerEmail ?? "Sin usuarios"} · {plural(o.screens, "pantalla", "pantallas")} · {plural(o.campaigns, "campaña", "campañas")}
                  {o.kind !== "advertiser" ? (o.clabe ? " · CLABE registrada" : " · Sin CLABE") : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-start justify-end gap-2">
                <OperateAsButton orgId={o.id} />
                {viewer.org?.id !== o.id ? <DeleteOrgButton orgId={o.id} name={o.name} /> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
