"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, FormError, TextInput } from "@/components/ui/form";
import { CLABE_BANKS, normalizeClabe, validateClabe } from "@/lib/clabe";
import {
  DEFAULT_PROFILE,
  PROFILE_LABEL,
  SCREEN_PROFILES,
  SITE_KIND_LABEL,
  SITE_KINDS,
  type ScreenProfile,
  type SiteKind,
} from "@/lib/host-catalog";

async function send(url: string, method: "POST" | "PATCH", body: unknown) {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; bankName?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "No se pudo guardar." };
    return { ok: true as const, data };
  } catch {
    return { ok: false as const, error: "Sin conexión. Intenta de nuevo." };
  }
}

function useForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return { router, busy, setBusy, error, setError };
}

function Actions({ busy, label, secondary }: { busy: boolean; label: string; secondary?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <Button type="submit" disabled={busy}>
        {busy ? "Guardando…" : label}
      </Button>
      {secondary}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function BusinessForm({
  defaults,
  next,
  submitLabel = "Guardar y seguir",
}: {
  defaults: { name: string; legalName: string };
  next?: string;
  submitLabel?: string;
}) {
  const f = useForm();
  const [saved, setSaved] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    f.setBusy(true);
    f.setError(null);
    setSaved(false);
    const res = await send("/api/host/org", "PATCH", {
      business: { name: form.get("name"), legalName: form.get("legalName") },
    });
    f.setBusy(false);
    if (!res.ok) return f.setError(res.error);
    setSaved(true);
    if (next) f.router.push(next);
    f.router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Nombre de tu negocio" hint="Así lo verán los anunciantes.">
        <TextInput name="name" defaultValue={defaults.name} required maxLength={80} autoComplete="organization" />
      </Field>
      <Field label="Razón social o nombre completo" hint="Para tus estados de cuenta.">
        <TextInput name="legalName" defaultValue={defaults.legalName} required maxLength={160} />
      </Field>
      <FormError>{f.error}</FormError>
      <Actions busy={f.busy} label={submitLabel} secondary={saved && !next ? <SavedNote /> : null} />
    </form>
  );
}

function SavedNote() {
  return <span role="status" className="text-[length:var(--cd-small)] text-[var(--cd-success)]">Guardado</span>;
}

// ---------------------------------------------------------------------------

export function ClabeForm({
  defaults,
  next,
  submitLabel = "Guardar y seguir",
}: {
  defaults: { clabe: string; holder: string };
  next?: string;
  submitLabel?: string;
}) {
  const f = useForm();
  const [clabe, setClabe] = useState(defaults.clabe);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const digits = normalizeClabe(clabe);
  const bank = digits.length >= 3 ? CLABE_BANKS[digits.slice(0, 3)] : undefined;
  const check = validateClabe(clabe);
  const showError = (touched || digits.length >= 18) && !check.ok && digits.length > 0;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!check.ok) return;
    const form = new FormData(e.currentTarget);
    f.setBusy(true);
    f.setError(null);
    setSaved(false);
    const res = await send("/api/host/org", "PATCH", { clabe: { clabe: digits, holder: form.get("holder") } });
    f.setBusy(false);
    if (!res.ok) return f.setError(res.error);
    setSaved(true);
    if (next) f.router.push(next);
    f.router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label="CLABE interbancaria"
        error={showError && !check.ok ? check.error : null}
        hint={
          check.ok ? (
            <span className="text-[var(--cd-success)]">{check.bankName} · CLABE válida</span>
          ) : bank ? (
            `${bank} · ${digits.length} de 18 dígitos`
          ) : (
            "18 dígitos. La encuentras en la app de tu banco."
          )
        }
      >
        <TextInput
          name="clabe"
          inputMode="numeric"
          autoComplete="off"
          value={clabe}
          onChange={(e) => setClabe(e.target.value.replace(/[^\d\s-]/g, "").slice(0, 24))}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          className="font-mono tracking-[0.06em]"
          placeholder="012 180 00123456789 9"
          required
        />
      </Field>
      <Field label="Titular de la cuenta" hint="Como aparece en tu banco.">
        <TextInput name="holder" defaultValue={defaults.holder} required maxLength={160} />
      </Field>
      <FormError>{f.error}</FormError>
      <Actions busy={f.busy} label={submitLabel} secondary={saved && !next ? <SavedNote /> : null} />
    </form>
  );
}

// ---------------------------------------------------------------------------

function ChoiceCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "rounded-[var(--cd-radius-md)] border p-3.5 text-left transition-colors",
        active ? "border-[var(--cd-ink)] bg-[var(--cd-bg)]" : "border-[var(--cd-line)] bg-[var(--cd-surface)] hover:bg-[var(--cd-bg)]",
      ].join(" ")}
    >
      <span className="block text-[length:var(--cd-body)] font-medium">{title}</span>
      {body ? <span className="mt-0.5 block text-[length:var(--cd-small)] text-[var(--cd-muted)]">{body}</span> : null}
    </button>
  );
}

function SiteFields({ kind, setKind }: { kind: SiteKind; setKind: (k: SiteKind) => void }) {
  return (
    <>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[length:var(--cd-label)] font-medium text-[var(--cd-ink-2)]">Tipo de sitio</legend>
        <div className="grid grid-cols-2 gap-2">
          {SITE_KINDS.map((k) => (
            <ChoiceCard key={k} active={kind === k} onClick={() => setKind(k)} title={SITE_KIND_LABEL[k]} />
          ))}
        </div>
      </fieldset>
      <Field label="Nombre del sitio" hint="Por ejemplo: Plaza Norte · Estacionamiento.">
        <TextInput name="siteName" required maxLength={80} />
      </Field>
      <Field label="Dirección" hint="Ayuda a los anunciantes a elegir dónde aparecer.">
        <TextInput name="siteAddress" maxLength={200} autoComplete="street-address" />
      </Field>
    </>
  );
}

export function SiteForm({ next }: { next: string }) {
  const f = useForm();
  const [kind, setKind] = useState<SiteKind>("parking");
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    f.setBusy(true);
    f.setError(null);
    const res = await send("/api/host/sites", "POST", { name: form.get("siteName"), address: form.get("siteAddress"), kind });
    f.setBusy(false);
    if (!res.ok) return f.setError(res.error);
    f.router.push(next);
    f.router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <SiteFields kind={kind} setKind={setKind} />
      <FormError>{f.error}</FormError>
      <Actions busy={f.busy} label="Guardar y seguir" />
    </form>
  );
}

// ---------------------------------------------------------------------------

export type SiteOption = { id: string; name: string; kind: SiteKind };

/**
 * New screen. With `allowNewSite`, the host can create the site in the same
 * step. On success goes to the screen page (kiosk link and QR).
 */
export function ScreenForm({ sites, allowNewSite = false }: { sites: SiteOption[]; allowNewSite?: boolean }) {
  const f = useForm();
  const [siteId, setSiteId] = useState<string | "new">(sites[sites.length - 1]?.id ?? "new");
  const [newKind, setNewKind] = useState<SiteKind>("parking");
  const siteKind = siteId === "new" ? newKind : (sites.find((s) => s.id === siteId)?.kind ?? "parking");
  const [profileChoice, setProfile] = useState<ScreenProfile | null>(null);
  const profile = profileChoice ?? DEFAULT_PROFILE[siteKind];
  const [acceptsAds, setAcceptsAds] = useState(true);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    f.setBusy(true);
    f.setError(null);
    let targetSite = siteId;
    if (siteId === "new") {
      const site = await send("/api/host/sites", "POST", {
        name: form.get("siteName"),
        address: form.get("siteAddress"),
        kind: newKind,
      });
      if (!site.ok || !site.data.id) {
        f.setBusy(false);
        return f.setError(site.ok ? "No se pudo crear el sitio." : site.error);
      }
      targetSite = site.data.id;
      setSiteId(site.data.id);
    }
    const res = await send("/api/host/screens", "POST", { siteId: targetSite, name: form.get("name"), profile, acceptsAds });
    if (!res.ok || !res.data.id) {
      f.setBusy(false);
      return f.setError(res.ok ? "No se pudo crear la pantalla." : res.error);
    }
    f.router.push(`/host/pantallas/${res.data.id}?nueva=1`);
    f.router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {sites.length > 0 || allowNewSite ? (
        <fieldset>
          <legend className="mb-1.5 text-[length:var(--cd-label)] font-medium text-[var(--cd-ink-2)]">Sitio</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {sites.map((s) => (
              <ChoiceCard
                key={s.id}
                active={siteId === s.id}
                onClick={() => {
                  setSiteId(s.id);
                  setProfile(null);
                }}
                title={s.name}
                body={SITE_KIND_LABEL[s.kind]}
              />
            ))}
            {allowNewSite ? (
              <ChoiceCard
                active={siteId === "new"}
                onClick={() => {
                  setSiteId("new");
                  setProfile(null);
                }}
                title="Nuevo sitio"
                body="Otro local o sucursal"
              />
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {siteId === "new" ? (
        <div className="flex flex-col gap-5 rounded-[var(--cd-radius-md)] border border-[var(--cd-line)] p-4">
          <SiteFields
            kind={newKind}
            setKind={(k) => {
              setNewKind(k);
              setProfile(null);
            }}
          />
        </div>
      ) : null}

      <Field label="Nombre de la pantalla" hint="Para reconocerla: Caseta de salida, Entrada principal…">
        <TextInput name="name" required maxLength={80} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-[length:var(--cd-label)] font-medium text-[var(--cd-ink-2)]">¿Cómo cobra esta pantalla?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCREEN_PROFILES.map((p) => (
            <ChoiceCard key={p} active={profile === p} onClick={() => setProfile(p)} title={PROFILE_LABEL[p].title} body={PROFILE_LABEL[p].body} />
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-[var(--cd-radius-md)] border border-[var(--cd-line)] p-3.5">
        <input
          type="checkbox"
          checked={acceptsAds}
          onChange={(e) => setAcceptsAds(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--cd-ink)]"
        />
        <span>
          <span className="block text-[length:var(--cd-body)] font-medium">Mostrar anuncios de marcas</span>
          <span className="block text-[length:var(--cd-small)] text-[var(--cd-muted)]">
            Las marcas podrán elegir esta pantalla y tú recibes la mayor parte de lo que paguen.
          </span>
        </span>
      </label>

      <FormError>{f.error}</FormError>
      <Actions busy={f.busy} label="Crear pantalla" />
    </form>
  );
}
