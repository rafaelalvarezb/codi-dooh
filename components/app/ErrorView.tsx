"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/form";

/** Shared body for segment error boundaries (error.tsx). */
export function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-3 py-16 sm:items-center sm:text-center">
      <p className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Algo salió mal</p>
      <p className="text-[length:var(--cd-body)] text-[var(--cd-muted)]">
        No pudimos cargar esta página. Revisa tu conexión e intenta de nuevo. Si sigue pasando, escríbenos.
      </p>
      <Button className="mt-2" onClick={() => retry()}>
        Intentar de nuevo
      </Button>
    </main>
  );
}
