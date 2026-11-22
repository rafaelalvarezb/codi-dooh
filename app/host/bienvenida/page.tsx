import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/app/Page";
import { buttonClass } from "@/components/ui/form";
import { BusinessForm, ClabeForm, ScreenForm, SiteForm } from "@/components/host/HostForms";
import { orgCtx, requireOrgViewer } from "@/lib/auth/dal";
import { listSites, onboardingState } from "@/lib/data/host";

export const metadata: Metadata = { title: "Da de alta tu negocio · CODI·DOOH" };

const STEPS = [
  { id: "business", title: "Tu negocio", body: "Nombre y razón social." },
  { id: "clabe", title: "Tu CLABE", body: "A dónde te pagamos lo que ganes con anuncios." },
  { id: "site", title: "Tu sitio", body: "El lugar donde está la pantalla." },
  { id: "screen", title: "Tu pantalla", body: "La tableta del kiosco." },
] as const;
type StepId = (typeof STEPS)[number]["id"];

export default async function Page({ searchParams }: PageProps<"/host/bienvenida">) {
  const viewer = await requireOrgViewer("host", "/host/bienvenida");
  const ctx = orgCtx(viewer);
  const [state, sites, sp] = await Promise.all([onboardingState(ctx), listSites(ctx), searchParams]);

  // ?paso= lets the host go back to a completed step; never skip ahead.
  const requested = typeof sp.paso === "string" ? (sp.paso as StepId) : null;
  const firstOpen = STEPS.findIndex((s) => !state.steps[s.id]);
  const reachable = (id: StepId) => {
    const i = STEPS.findIndex((s) => s.id === id);
    return i >= 0 && (firstOpen === -1 || i <= firstOpen);
  };
  const current: StepId | null = requested && reachable(requested) ? requested : state.next;

  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={viewer.org.name}
        title="Da de alta tu negocio"
        description="Cuatro pasos y tu pantalla queda lista para mostrar anuncios y cobrar con CoDi."
      />

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Pasos">
        {STEPS.map((s, i) => {
          const done = state.steps[s.id];
          const active = s.id === current;
          const content = (
            <>
              <span
                className={[
                  "block h-1 rounded-full",
                  active ? "bg-[var(--cd-ink)]" : done ? "bg-[var(--cd-ink-2)] opacity-40" : "bg-[var(--cd-line)]",
                ].join(" ")}
              />
              <span className={`mt-2 block text-[length:var(--cd-label)] ${active ? "font-medium text-[var(--cd-ink)]" : "text-[var(--cd-muted)]"}`}>
                {i + 1}. {s.title}
              </span>
            </>
          );
          return (
            <li key={s.id} aria-current={active ? "step" : undefined}>
              {done && !active && reachable(s.id) ? (
                <Link href={`/host/bienvenida?paso=${s.id}`} className="block hover:opacity-80">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>

      <Card className="mt-6 px-5 py-6 sm:px-7">
        {current === null ? (
          <div>
            <p className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Listo, ya estás dado de alta</p>
            <p className="mt-2 text-[length:var(--cd-body)] text-[var(--cd-muted)]">
              Abre el link del kiosco en tu tableta para empezar. Desde Pantallas puedes agregar más.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/host/pantallas" className={buttonClass()}>
                Ver mis pantallas
              </Link>
              <Link href="/host" className={buttonClass("secondary")}>
                Ir al resumen
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">
              {STEPS.find((s) => s.id === current)?.title}
            </h2>
            <p className="mt-1 mb-6 text-[length:var(--cd-small)] text-[var(--cd-muted)]">{STEPS.find((s) => s.id === current)?.body}</p>
            {current === "business" ? (
              <BusinessForm defaults={{ name: state.org.name, legalName: state.org.legalName ?? "" }} next="/host/bienvenida" />
            ) : current === "clabe" ? (
              <ClabeForm defaults={{ clabe: state.org.clabe ?? "", holder: state.org.clabeHolder ?? state.org.legalName ?? "" }} next="/host/bienvenida" />
            ) : current === "site" ? (
              <SiteForm next="/host/bienvenida" />
            ) : (
              <ScreenForm sites={sites.map((s) => ({ id: s.id, name: s.name, kind: s.kind }))} />
            )}
          </>
        )}
      </Card>
    </main>
  );
}
