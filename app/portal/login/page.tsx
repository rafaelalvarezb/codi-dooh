import { Suspense } from "react";
import { PortalLoginGate } from "@/components/portal/PortalLoginGate";

export default function PortalLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-6 text-[var(--cd-muted)]">
          Cargando…
        </main>
      }
    >
      <PortalLoginGate />
    </Suspense>
  );
}
