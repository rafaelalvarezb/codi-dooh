"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/form";

/** Creates the sandbox as soon as the page opens (one click from the landing). */
export function StartDemo() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      const res = await fetch("/api/demo/start", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!res.ok || !data.next) return setError(data.error ?? "No pudimos preparar la cuenta de prueba.");
      router.replace(data.next);
      router.refresh();
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="rounded-[var(--cd-radius-md)] bg-[var(--cd-danger-soft)] px-4 py-3 text-[length:var(--cd-small)] text-[var(--cd-danger)]">
          {error}
        </p>
        <Button type="button" onClick={() => void start()}>
          Intentar de nuevo
        </Button>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-3 text-[length:var(--cd-body)] text-[var(--cd-ink-2)]">
      <span className="size-5 animate-spin rounded-full border-2 border-[var(--cd-line)] border-t-[var(--cd-ink)]" />
      Preparando tu cuenta de prueba…
    </div>
  );
}
