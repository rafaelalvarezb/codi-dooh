"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/form";

export function PauseToggle({ campaignId, paused }: { campaignId: string; paused: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: paused ? "active" : "paused" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo actualizar.");
        return;
      }
      router.refresh();
    } catch {
      setError("Sin conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={() => void toggle()} disabled={busy}>
        {busy ? "Guardando…" : paused ? "Reanudar" : "Pausar"}
      </Button>
      {error ? <span className="text-[length:var(--cd-label)] text-[var(--cd-danger)]">{error}</span> : null}
    </div>
  );
}
