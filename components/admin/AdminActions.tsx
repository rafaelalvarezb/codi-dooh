"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, FormError, TextInput } from "@/components/ui/form";

async function call(url: string, method: "PATCH" | "PUT" | "POST" | "DELETE", body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string } & Record<string, unknown>;
    if (!res.ok) return { error: data.error ?? "No se pudo guardar.", data };
    return { error: null, data };
  } catch {
    return { error: "Sin conexión.", data: {} as Record<string, unknown> };
  }
}

function ErrorText({ children }: { children: string | null }) {
  return children ? <span className="text-[length:var(--cd-label)] text-[var(--cd-danger)]">{children}</span> : null;
}

// ---------------------------------------------------------------------------

export function CreativeModeration({ id, status }: { id: string; status: "active" | "paused" | "rejected" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  async function set(next: "active" | "paused" | "rejected", withNote?: string) {
    setBusy(true);
    setError(null);
    const res = await call(`/api/admin/creatives/${id}`, "PATCH", { status: next, note: withNote });
    setBusy(false);
    if (res.error) return setError(res.error);
    setRejecting(false);
    setNote("");
    router.refresh();
  }

  if (rejecting) {
    return (
      <form
        className="flex w-full flex-col gap-2 sm:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          void set("rejected", note);
        }}
      >
        <TextInput
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Motivo (lo verá el anunciante)"
          maxLength={300}
          autoFocus
          className="!h-9 !px-3 text-[length:var(--cd-small)]"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="danger" size="sm" disabled={busy}>
            {busy ? "Guardando…" : "Rechazar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
            Cancelar
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "active" ? (
          <>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void set("paused")}>
              Pausar
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRejecting(true)}>
              Rechazar
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void set("active")}>
            Reactivar
          </Button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function CampaignAdminControls({
  id,
  billing,
  paused,
}: {
  id: string;
  billing: "paid" | "pilot" | "house";
  paused: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function patch(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    const res = await call(`/api/admin/campaigns/${id}`, "PATCH", body);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {billing !== "house" ? (
          <label className="inline-flex h-9 items-center gap-2 rounded-[var(--cd-radius-sm)] border border-[var(--cd-line)] bg-[var(--cd-bg)] px-2.5 text-[length:var(--cd-small)]">
            <span className="text-[var(--cd-muted)]">Cobro</span>
            <select
              value={billing}
              disabled={busy}
              onChange={(e) => void patch({ billing: e.target.value })}
              className="bg-transparent font-medium outline-none"
              aria-label="Tipo de cobro"
            >
              <option value="paid">Pagada</option>
              <option value="pilot">Piloto</option>
            </select>
          </label>
        ) : null}
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void patch({ status: paused ? "active" : "paused" })}>
          {paused ? "Reanudar" : "Pausar"}
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SettingsForm({
  defaults,
}: {
  defaults: { spotPriceMxn: number; commissionPct: number; payoutDay: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [commission, setCommission] = useState(String(defaults.commissionPct));
  const pct = Number(commission);
  const valid = Number.isFinite(pct) && pct >= 0 && pct <= 100;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await call("/api/admin/settings", "PUT", {
      spotPriceMxn: Number(form.get("spotPriceMxn")),
      commissionPct: pct,
      payoutDay: Number(form.get("payoutDay")),
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Precio por spot, por pantalla, al mes (MXN)" hint="Aplica a las campañas nuevas. Las que ya existen conservan su precio.">
        <TextInput name="spotPriceMxn" type="number" inputMode="numeric" min={1} step={1} defaultValue={defaults.spotPriceMxn} required />
      </Field>
      <Field
        label="Comisión de la plataforma (%)"
        hint={valid ? `El host recibe ${(100 - pct).toLocaleString("es-MX", { maximumFractionDigits: 2 })}%. Se recalculan también los meses anteriores.` : "Entre 0 y 100."}
      >
        <TextInput
          name="commissionPct"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.5}
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          aria-invalid={!valid}
          required
        />
      </Field>
      <Field label="Día de pago a hosts" hint="Del 1 al 28. Se paga lo del mes anterior.">
        <TextInput name="payoutDay" type="number" inputMode="numeric" min={1} max={28} step={1} defaultValue={defaults.payoutDay} required />
      </Field>
      <FormError>{error}</FormError>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !valid}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
        {saved ? (
          <span role="status" className="text-[length:var(--cd-small)] text-[var(--cd-success)]">
            Guardado
          </span>
        ) : null}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function OperateAsButton({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await call("/api/auth/switch-org", "POST", { orgId });
    setBusy(false);
    if (res.error) return setError(res.error);
    router.push(typeof res.data.next === "string" ? res.data.next : "/");
    router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => void go()}>
        Operar como
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

/** Typed confirmation: the exact org name must be written. */
export function DeleteOrgButton({ orgId, name }: { orgId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await call(`/api/admin/orgs/${orgId}`, "DELETE", { confirmName: typed });
    setBusy(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-[var(--cd-danger)]">
        Eliminar
      </Button>
    );
  }
  return (
    <form
      onSubmit={remove}
      className="flex w-full flex-col gap-2 rounded-[var(--cd-radius-md)] bg-[var(--cd-danger-soft)] p-3 text-[length:var(--cd-small)] text-[var(--cd-danger)] sm:w-80"
    >
      <p>
        Se borran para siempre sus pantallas, videos, campañas y reproducciones. Escribe <strong>{name}</strong> para confirmar.
      </p>
      <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus className="!h-9 !px-3 text-[length:var(--cd-small)]" aria-label="Nombre de la organización" />
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={busy || typed.trim() !== name.trim()} className="!border-[var(--cd-danger)]">
          {busy ? "Eliminando…" : "Eliminar para siempre"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      {error ? <p>{error}</p> : null}
    </form>
  );
}

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function seed() {
    setBusy(true);
    setMsg(null);
    const res = await call("/api/admin/seed", "POST");
    setBusy(false);
    if (res.error) return setMsg(res.error);
    const plays = Number(res.data.plays ?? 0);
    const pays = Number(res.data.payments ?? 0);
    setMsg(`Listo: últimas 2 semanas de demo con ${plays.toLocaleString("es-MX")} reproducciones y ${pays.toLocaleString("es-MX")} cobros.`);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => void seed()}>
        {busy ? "Cargando…" : "Cargar datos de demo"}
      </Button>
      {msg ? <span role="status" className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">{msg}</span> : null}
    </div>
  );
}
