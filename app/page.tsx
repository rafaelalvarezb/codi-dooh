import { Suspense } from "react";
import { KioskShell } from "@/components/KioskShell";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[var(--cd-bg)] text-[var(--cd-text-secondary)]">
          Cargando kiosco…
        </div>
      }
    >
      <KioskShell />
    </Suspense>
  );
}
