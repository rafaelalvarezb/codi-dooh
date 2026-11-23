import Link from "next/link";
import { CobtenLogo } from "@/components/brand/CobtenLogo";
import type { ReactNode } from "react";
import { requireViewer } from "@/lib/auth/dal";
import { canAdvertise, canHost, type Area } from "@/lib/auth/roles";
import { AccountMenu, ActingAsBanner, NavLinks, type NavItem } from "./AppShellClient";
import { DemoBadge } from "./DemoBadge";

/** Authenticated frame for /anunciantes, /host and /admin. */
export async function AppShell({ area, children }: { area: Area; children: ReactNode }) {
  const viewer = await requireViewer(area);
  const kind = viewer.org?.kind;

  const nav: NavItem[] = [];
  if (area === "admin") {
    nav.push({ href: "/admin", label: "Resumen", exact: true });
    nav.push({ href: "/admin/creativos", label: "Videos" });
    nav.push({ href: "/admin/campanas", label: "Campañas" });
    nav.push({ href: "/admin/organizaciones", label: "Organizaciones" });
    nav.push({ href: "/admin/contactos", label: "Contactos" });
    nav.push({ href: "/admin/ajustes", label: "Ajustes" });
  } else if (canHost(kind)) {
    nav.push({ href: "/host", label: "Resumen", exact: true });
    nav.push({ href: "/host/ingresos", label: "Ingresos" });
    nav.push({ href: "/host/pantallas", label: "Pantallas" });
    nav.push({ href: "/host/campanas", label: "Mis anuncios" });
  }
  if (area !== "admin" && canAdvertise(kind)) nav.push({ href: "/anunciantes", label: "Campañas" });
  if (area !== "admin" && viewer.isPlatformAdmin) nav.push({ href: "/admin", label: "Admin" });

  return (
    <div className="min-h-dvh bg-[var(--cd-surface)]">
      {viewer.actingAsAdmin && viewer.org ? <ActingAsBanner orgName={viewer.org.name} /> : null}
      <header className="sticky top-0 z-30 border-b border-[var(--cd-line)] bg-[var(--cd-bg)]/95 backdrop-blur">
        {/* Phone: logo + account on top, sections in a scrollable row below. */}
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 px-4 sm:h-14 sm:flex-nowrap sm:px-6">
          <Link
            href="/"
            prefetch={false}
            aria-label="cobten"
            className="flex h-14 shrink-0 items-center text-[19px] sm:h-auto"
          >
            <CobtenLogo />
          </Link>
          <div className="order-last -mx-3 w-[calc(100%+1.5rem)] min-w-0 px-3 pb-2.5 sm:order-none sm:mx-0 sm:w-auto sm:px-0 sm:pb-0">
            <NavLinks items={nav} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {viewer.org?.isDemo ? <DemoBadge /> : null}
            <AccountMenu
              name={viewer.name}
              email={viewer.email}
              orgName={viewer.org?.name ?? "Plataforma"}
              orgs={viewer.orgs}
              activeOrgId={viewer.org?.id ?? null}
            />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">{children}</div>
    </div>
  );
}

export function AppShellFallback() {
  return (
    <div className="min-h-dvh bg-[var(--cd-surface)]">
      <div className="h-[106px] border-b border-[var(--cd-line)] bg-[var(--cd-bg)] sm:h-14" />
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-[var(--cd-radius-sm)] bg-[var(--cd-line)]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--cd-radius-md)] bg-[var(--cd-bg)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
