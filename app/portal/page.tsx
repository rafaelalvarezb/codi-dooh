import { Suspense } from "react";
import { PortalDashboard } from "@/components/portal/PortalDashboard";

export default function PortalHomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--cd-muted)]">
          Cargando portal…
        </main>
      }
    >
      <PortalDashboard />
    </Suspense>
  );
}
