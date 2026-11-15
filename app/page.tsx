import { Suspense } from "react";
import { KioskShell } from "@/components/KioskShell";

export default function HomePage() {
  return (
    <div className="kiosk-mode contents">
      <style>{`body{overflow:hidden;user-select:none;touch-action:manipulation}`}</style>
      <Suspense
        fallback={
          <div className="flex h-dvh items-center justify-center bg-[var(--cd-bg)] text-[var(--cd-muted)]">
            Cargando kiosco…
          </div>
        }
      >
        <KioskShell />
      </Suspense>
    </div>
  );
}
