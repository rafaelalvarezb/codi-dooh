"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/form";

export function CopyButton({ value, label = "Copiar link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia este link:", value);
    }
  }
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
      <span aria-live="polite">{copied ? "Copiado" : label}</span>
    </Button>
  );
}

async function post(url: string, method: "POST" | "PATCH", body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "No se pudo guardar.";
  } catch {
    return "Sin conexión.";
  }
}

/** Two-step confirm: rotating breaks the link on the kiosk until it is updated. */
export function RotateTokenButton({ screenId }: { screenId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    setBusy(true);
    setError(null);
    const err = await post(`/api/host/screens/${screenId}/token`, "POST");
    setBusy(false);
    if (err) return setError(err);
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(true)}>
        Cambiar token
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-[var(--cd-radius-md)] bg-[var(--cd-danger-soft)] p-4 text-[length:var(--cd-small)] text-[var(--cd-danger)]">
      <p>
        El link actual dejará de funcionar para reportar anuncios. Tendrás que abrir el nuevo link en el kiosco. Hazlo si
        crees que alguien más tiene el link.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void rotate()} className="!border-[var(--cd-danger)]">
          {busy ? "Cambiando…" : "Sí, cambiar token"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
      {error ? <p>{error}</p> : null}
    </div>
  );
}

export function AcceptsAdsToggle({ screenId, acceptsAds }: { screenId: string; acceptsAds: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setError(null);
    const err = await post(`/api/host/screens/${screenId}`, "PATCH", { acceptsAds: !acceptsAds });
    setBusy(false);
    if (err) return setError(err);
    router.refresh();
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={acceptsAds}
          disabled={busy}
          onChange={() => void toggle()}
          className="h-4 w-4 accent-[var(--cd-ink)]"
        />
        <span className="text-[length:var(--cd-body)]">Mostrar anuncios de marcas</span>
      </label>
      {error ? <span className="text-[length:var(--cd-small)] text-[var(--cd-danger)]">{error}</span> : null}
    </div>
  );
}
