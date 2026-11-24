"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { KioskPreview } from "@/components/dooh/KioskPreview";
import { DemoBadge } from "@/components/app/DemoBadge";
import { Button, Field, FormError, TextInput } from "@/components/ui/form";
import { isImageFile, precheck, readSourceMeta, uploadSource, type UploadMode } from "@/lib/client/creative-upload";
import { formatMxn } from "@/lib/pricing";
import { DEFAULT_SLOT_SEC, minutesBetweenPlays } from "@/lib/reach";
import { CostSummary } from "./CostSummary";
import { TrimPicker } from "./TrimPicker";
import { letterboxFor, MAX_CREATIVE_MB, MAX_DURATION_SEC, MIN_DURATION_SEC, needsTrim, type Letterbox } from "@/lib/video/rules";

export type WizardScreen = {
  id: string;
  name: string;
  siteName: string;
  siteAddress: string;
  hostName: string;
  isDemo: boolean;
  spotPriceCents: number;
  /** Host's estimate of people paying per day at this machine. */
  dailyPayers: number | null;
  /** Spots other live campaigns already have on this screen. */
  bookedSpots: number;
};

export type WizardCreative = {
  id: string;
  label: string;
  src: string;
  poster: string | null;
  durationMs: number;
  width: number;
  height: number;
};

type Props = {
  mode: "advertiser" | "house";
  orgId: string;
  uploadMode: UploadMode;
  screens: WizardScreen[];
  library: WizardCreative[];
  spotPriceCents: number;
  basePath: string;
};

const STEPS = ["Nombre", "Video", "Pantallas", "Fechas", "Revisión"] as const;

/** Keeps the active step visible in the horizontally scrolling step bar (phones). */
function StepScroller({ step }: { step: number }) {
  useEffect(() => {
    const list = document.getElementById("wizard-steps");
    const active = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (list && active) list.scrollTo({ left: Math.max(0, active.offsetLeft - list.offsetLeft - 16), behavior: "smooth" });
  }, [step]);
  return null;
}
const DAY = 86_400_000;

function inputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseInputDate(value: string, endOfDay: boolean): Date {
  const [y, m, d] = value.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d, 0, 0, 0);
}

/** Starting today means "now", so the spot goes live the moment it's published. */
function publishStart(startDate: string, today: string, startsAt: Date): Date {
  return startDate === today ? new Date(Date.now() - 60_000) : startsAt;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function CampaignWizard(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [creative, setCreative] = useState<WizardCreative | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    props.screens.length === 1 ? { [props.screens[0].id]: 1 } : {},
  );
  const [today] = useState(() => inputDate(new Date()));
  const [startDate, setStartDate] = useState(today);
  // Inclusive range: today + 29 days = 30 days on air.
  const [endDate, setEndDate] = useState(() => inputDate(new Date(Date.now() + 29 * DAY)));
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const startsAt = useMemo(() => parseInputDate(startDate, false), [startDate]);
  const endsAt = useMemo(() => parseInputDate(endDate, true), [endDate]);
  const chosen = props.screens.filter((s) => selected[s.id]);
  const adSec = creative ? Math.max(1, Math.round(creative.durationMs / 1000)) : DEFAULT_SLOT_SEC;
  const showSummary = step >= 2;
  const summary = (
    <CostSummary
      screens={chosen.map((s) => ({
        id: s.id,
        name: s.name,
        spots: selected[s.id],
        bookedSpots: s.bookedSpots,
        dailyPayers: s.dailyPayers,
      }))}
      spotPriceCents={props.spotPriceCents}
      startsAt={startsAt}
      endsAt={endsAt}
      adSec={adSec}
      free={props.mode === "house"}
    />
  );

  const canContinue =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && creative !== null) ||
    (step === 2 && chosen.length > 0) ||
    (step === 3 && endsAt.getTime() > startsAt.getTime() && startDate >= today) ||
    step === 4;

  async function publish() {
    if (!creative) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          creativeId: creative.id,
          screens: chosen.map((s) => ({ screenId: s.id, spots: selected[s.id] })),
          startsAt: publishStart(startDate, today, startsAt).toISOString(),
          endsAt: endsAt.toISOString(),
          mode: props.mode,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; campaign?: { id: string } };
      if (!res.ok || !data.campaign) {
        setError(data.error ?? "No se pudo publicar la campaña.");
        return;
      }
      router.push(`${props.basePath}/${data.campaign.id}?publicada=1`);
      router.refresh();
    } catch {
      setError("Sin conexión. No se pudo publicar la campaña.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mt-6">
      <StepScroller step={step} />
      <ol id="wizard-steps" className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li key={label} className="shrink-0">
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={[
                "flex items-center gap-2 rounded-[var(--cd-radius-pill)] px-3 py-1.5 text-[length:var(--cd-small)] font-medium",
                i === step
                  ? "bg-[var(--cd-ink)] text-white"
                  : i < step
                    ? "text-[var(--cd-ink)] hover:bg-[var(--cd-bg)]"
                    : "text-[var(--cd-subtle)]",
              ].join(" ")}
            >
              <span className="font-mono text-[11px]">{i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className={showSummary ? "mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start" : "mt-4"}>
      <div className="min-w-0 rounded-[var(--cd-radius-lg)] border border-[var(--cd-line)] bg-[var(--cd-bg)] p-5 sm:p-8">
        {step === 0 ? (
          <div className="max-w-md">
            <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">¿Cómo se llama tu campaña?</h2>
            <p className="mt-1 text-[length:var(--cd-small)] text-[var(--cd-muted)]">Solo tú lo ves. Ejemplo: Temporada navideña.</p>
            <div className="mt-6">
              <Field label="Nombre de la campaña">
                <TextInput
                  autoFocus
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canContinue && setStep(1)}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <CreativeStep
            orgId={props.orgId}
            uploadMode={props.uploadMode}
            library={props.library}
            value={creative}
            defaultLabel={name}
            onChange={setCreative}
          />
        ) : null}

        {step === 2 ? (
          <ScreensStep
            screens={props.screens}
            selected={selected}
            onChange={setSelected}
            spotPriceCents={props.spotPriceCents}
            house={props.mode === "house"}
            adSec={adSec}
          />
        ) : null}

        {step === 3 ? (
          <div className="max-w-lg">
            <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">¿Cuándo corre?</h2>
            <p className="mt-1 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
              Si empieza hoy, entra a las pantallas en cuanto publiques.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Inicio">
                <TextInput type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="Fin" error={endsAt <= startsAt ? "Debe terminar después de empezar." : null}>
                <TextInput type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setEndDate(inputDate(new Date(parseInputDate(startDate, false).getTime() + (days - 1) * DAY)))}
                  className="rounded-[var(--cd-radius-pill)] border border-[var(--cd-line)] px-3 py-1.5 text-[length:var(--cd-small)] hover:bg-[var(--cd-surface)]"
                >
                  {days} días
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 && creative ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Revisa y publica</h2>
              <p className="mt-1 text-[length:var(--cd-small)] text-[var(--cd-muted)]">Así se verá en el kiosco.</p>
              <div className="mt-4">
                <KioskPreview src={creative.src} poster={creative.poster} showSafeZone={false} />
              </div>
            </div>
            <dl className="divide-y divide-[var(--cd-line)] self-start rounded-[var(--cd-radius-md)] border border-[var(--cd-line)] text-[length:var(--cd-small)]">
              <Row label="Campaña" value={name} />
              <Row label="Video" value={`${creative.label} · ${Math.round(creative.durationMs / 1000)} s`} />
              <Row label="Pantallas" value={`${chosen.length} · ${chosen.reduce((a, s) => a + selected[s.id], 0)} spots`} />
              <Row label="Fechas" value={`${formatDate(startsAt)} – ${formatDate(endsAt)}`} />
              {props.mode === "advertiser" ? (
                <p className="px-4 py-3 text-[length:var(--cd-label)] text-[var(--cd-muted)]">
                  El total y lo que obtienes están en el resumen. No te cobramos nada hoy: se agrega a tu saldo por pagar.
                </p>
              ) : null}
            </dl>
          </div>
        ) : null}

        {showSummary ? <div className="mt-8 lg:hidden">{summary}</div> : null}

        <FormError>{error}</FormError>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--cd-line)] pt-5">
          <Button variant="ghost" type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || publishing}>
            Atrás
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Continuar
            </Button>
          ) : (
            <Button type="button" onClick={() => void publish()} disabled={publishing}>
              {publishing ? "Publicando…" : "Publicar"}
            </Button>
          )}
        </div>
      </div>
      {showSummary ? <aside className="hidden lg:sticky lg:top-24 lg:block">{summary}</aside> : null}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-[var(--cd-muted)]">{label}</dt>
      <dd className={`text-right ${strong ? "text-[length:var(--cd-body)] font-medium tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}

function CreativeStep({
  orgId,
  uploadMode,
  library,
  value,
  defaultLabel,
  onChange,
}: {
  orgId: string;
  uploadMode: UploadMode;
  library: WizardCreative[];
  value: WizardCreative | null;
  defaultLabel: string;
  onChange: (c: WizardCreative | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "checking" | "uploading" | "processing">("idle");
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [localPreview, setLocalPreview] = useState<{ src: string; letterbox: Letterbox } | null>(null);
  /** A video longer than a spot, waiting for the advertiser to pick its 15 s. */
  const [toTrim, setToTrim] = useState<{ file: File; src: string; durationMs: number } | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const busy = phase !== "idle";

  async function onFile(file: File) {
    setErrors([]);
    setLocalPreview(null);
    setToTrim(null);
    onChange(null);
    setPhase("checking");
    // The browser may not decode every format; the server converts and re-checks.
    const meta = await readSourceMeta(file);
    const problems = precheck(file, meta);
    setPhase("idle");
    if (problems.length) {
      setErrors(problems);
      return;
    }
    if (meta && !meta.image && needsTrim(meta.durationMs)) {
      setTrimStart(0);
      setToTrim({ file, src: URL.createObjectURL(file), durationMs: meta.durationMs });
      return;
    }
    await upload(file, meta && !isImageFile(file) ? letterboxFor(meta.width, meta.height) : null);
  }

  async function upload(file: File, letterbox: Letterbox | null, trimStartMs?: number) {
    if (letterbox) setLocalPreview({ src: URL.createObjectURL(file), letterbox });
    try {
      setPhase("uploading");
      setProgress(0);
      const sourceUrl = await uploadSource({ file, orgId, mode: uploadMode, onProgress: setProgress });
      setPhase("processing");
      const label = (defaultLabel.trim() || file.name.replace(/\.[a-z0-9]{2,4}$/i, "")).slice(0, 80);
      const res = await fetch("/api/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, sourceUrl, trimStartMs }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        creative?: { id: string; label: string; blobUrl: string; posterUrl: string | null; durationMs: number; width: number; height: number };
      };
      if (!res.ok || !data.creative) throw new Error(data.error ?? "No se pudo preparar el video.");
      const c = data.creative;
      setToTrim(null);
      onChange({ id: c.id, label: c.label, src: c.blobUrl, poster: c.posterUrl, durationMs: c.durationMs, width: c.width, height: c.height });
    } catch (err) {
      setLocalPreview(null);
      setErrors([err instanceof Error ? err.message : "No se pudo subir el video."]);
    } finally {
      setPhase("idle");
    }
  }

  const preview = value ? { src: value.src, poster: value.poster } : localPreview ? { src: localPreview.src, poster: null } : null;
  const bars: Letterbox | null = value ? letterboxFor(value.width, value.height) : (localPreview?.letterbox ?? null);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Sube tu video o imagen</h2>
        <p className="mt-1 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
          Video de {MIN_DURATION_SEC} a {MAX_DURATION_SEC} segundos o una imagen (se muestra {MAX_DURATION_SEC} s), hasta {MAX_CREATIVE_MB} MB. Si
          tu video es más largo, eliges qué parte se ve. Horizontal, vertical o cuadrado: nosotros lo preparamos para el kiosco.
        </p>

        <div className="mt-4">
          {toTrim && !value ? (
            <div>
              <TrimPicker
                src={toTrim.src}
                durationMs={toTrim.durationMs}
                windowMs={MAX_DURATION_SEC * 1000}
                startMs={trimStart}
                onChange={setTrimStart}
              />
              {!busy ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void upload(toTrim.file, null, trimStart)}>
                    Usar este tramo
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
                    Elegir otro archivo
                  </Button>
                </div>
              ) : null}
            </div>
          ) : preview ? (
            <KioskPreview src={preview.src} poster={preview.poster} />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void onFile(f);
              }}
              className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-[var(--cd-radius-md)] border-2 border-dashed border-[var(--cd-line)] bg-[var(--cd-surface)] px-6 text-center hover:border-[var(--cd-subtle)]"
            >
              <span className="text-[length:var(--cd-body)] font-medium">Arrastra tu video o imagen aquí</span>
              <span className="text-[length:var(--cd-small)] text-[var(--cd-muted)]">o haz clic para elegirlo</span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/*,image/jpeg,image/png,image/webp,.mp4,.mov,.m4v,.webm,.mkv,.avi,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onFile(f);
          }}
        />

        {busy ? (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cd-line)]">
              <div
                className={`h-full bg-[var(--cd-ink)] transition-[width] ${phase === "processing" ? "animate-pulse" : ""}`}
                style={{ width: `${phase === "checking" ? 8 : phase === "processing" ? 100 : Math.max(8, progress)}%` }}
              />
            </div>
            <p className="mt-2 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
              {phase === "checking"
                ? "Revisando el video…"
                : phase === "uploading"
                  ? `Subiendo… ${Math.round(progress)}%`
                  : "Preparando tu video para el kiosco. Puede tardar hasta un minuto; no cierres esta página."}
            </p>
          </div>
        ) : null}

        {errors.length ? (
          <ul role="alert" className="mt-4 space-y-1 rounded-[var(--cd-radius-sm)] bg-[var(--cd-danger-soft)] px-4 py-3 text-[length:var(--cd-small)] text-[var(--cd-danger)]">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        {preview && !busy ? (
          <div className="mt-4 space-y-2 text-[length:var(--cd-small)]">
            <p className="text-[var(--cd-ink-2)]">
              {bars === "sides"
                ? "Tu video se ve completo, sin recortes. Como es más angosto que la pantalla, quedan franjas negras a los lados."
                : bars === "topBottom"
                  ? "Tu video se ve completo, sin recortes. Como es más ancho que la pantalla, quedan franjas negras arriba y abajo."
                  : "Tu video se ve completo y llena la pantalla."}
            </p>
            <button type="button" onClick={() => inputRef.current?.click()} className="font-medium underline underline-offset-4">
              Cambiar video
            </button>
          </div>
        ) : null}
      </div>

      {library.length ? (
        <div>
          <p className="text-[length:var(--cd-small)] font-medium">O usa uno que ya subiste</p>
          <ul className="mt-3 space-y-2">
            {library.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setErrors([]);
                    setLocalPreview(null);
                    onChange(c);
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-[var(--cd-radius-sm)] border p-2 text-left",
                    value?.id === c.id ? "border-[var(--cd-ink)]" : "border-[var(--cd-line)] hover:bg-[var(--cd-surface)]",
                  ].join(" ")}
                >
                  <Thumb src={c.src} poster={c.poster} />
                  <span className="min-w-0">
                    <span className="block truncate text-[length:var(--cd-small)] font-medium">{c.label}</span>
                    <span className="block text-[length:var(--cd-label)] text-[var(--cd-muted)]">
                      {Math.round(c.durationMs / 1000)} s · {c.width >= c.height ? "Horizontal" : "Vertical"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function Thumb({ src, poster }: { src: string; poster: string | null }) {
  return (
    <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[var(--cd-night)]">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- Blob-hosted thumbnail
        <img src={poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

function ScreensStep({
  screens,
  selected,
  onChange,
  spotPriceCents,
  house,
  adSec,
}: {
  screens: WizardScreen[];
  selected: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  spotPriceCents: number;
  house: boolean;
  adSec: number;
}) {
  if (screens.length === 0) {
    return (
      <div className="max-w-md">
        <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Aún no hay pantallas</h2>
        <p className="mt-1 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
          {house ? "Da de alta una pantalla en tu negocio para anunciarte en ella." : "Pronto habrá pantallas disponibles."}
        </p>
      </div>
    );
  }
  const toggle = (id: string) => {
    const next = { ...selected };
    if (next[id]) delete next[id];
    else next[id] = 1;
    onChange(next);
  };
  const setSpots = (id: string, spots: number) => onChange({ ...selected, [id]: Math.min(10, Math.max(1, spots)) });
  const allOn = screens.every((s) => selected[s.id]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">Elige pantallas y frecuencia</h2>
          <p className="mt-1 max-w-xl text-[length:var(--cd-small)] text-[var(--cd-muted)]">
            {house
              ? "Tus pantallas. Tus anuncios propios no tienen costo."
              : `Cada pantalla pasa los anuncios por turnos. Un spot es un turno tuyo: más spots, tu anuncio sale más seguido. ${formatMxn(spotPriceCents, { decimals: false })} al mes por spot en cada pantalla.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(allOn ? {} : Object.fromEntries(screens.map((s) => [s.id, selected[s.id] ?? 1])))}
          className="text-[length:var(--cd-small)] font-medium underline underline-offset-4"
        >
          {allOn ? "Quitar todas" : "Elegir todas"}
        </button>
      </div>
      <ul className="mt-5 divide-y divide-[var(--cd-line)] rounded-[var(--cd-radius-md)] border border-[var(--cd-line)]">
        {screens.map((s) => {
          const on = Boolean(selected[s.id]);
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {/* min width makes the spots stepper wrap to its own row on phones */}
              <label className="flex min-w-[220px] flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(s.id)}
                  className="h-5 w-5 shrink-0 accent-[var(--cd-ink)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[length:var(--cd-body)] font-medium">{s.name}</span>
                    {s.isDemo ? <DemoBadge /> : null}
                  </span>
                  <span className="block truncate text-[length:var(--cd-small)] text-[var(--cd-muted)]">
                    {s.siteName}
                    {s.siteAddress ? ` · ${s.siteAddress}` : ""}
                  </span>
                </span>
              </label>
              {on ? (
                <div className="ml-8 flex flex-col items-start gap-1 sm:ml-0 sm:items-end">
                  {!house ? (
                    <div className="flex items-center gap-1" role="group" aria-label={`Frecuencia en ${s.name}`}>
                      <StepperButton label="Menos" onClick={() => setSpots(s.id, selected[s.id] - 1)} disabled={selected[s.id] <= 1}>
                        −
                      </StepperButton>
                      <span className="w-16 text-center text-[length:var(--cd-small)] tabular-nums">
                        {selected[s.id]} {selected[s.id] === 1 ? "spot" : "spots"}
                      </span>
                      <StepperButton label="Más" onClick={() => setSpots(s.id, selected[s.id] + 1)} disabled={selected[s.id] >= 10}>
                        +
                      </StepperButton>
                    </div>
                  ) : null}
                  <span className="text-[length:var(--cd-label)] text-[var(--cd-muted)]">
                    {frequencyLabel(minutesBetweenPlays({ spots: selected[s.id], otherSpots: s.bookedSpots, dailyPayers: s.dailyPayers }, adSec))}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "sale ≈ cada 4 min" — how often your ad comes back on this screen. */
function frequencyLabel(minutes: number): string {
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return `Sale ≈ cada ${Math.max(5, Math.round((minutes * 60) / 5) * 5)} s`;
  return `Sale ≈ cada ${Math.round(minutes)} min`;
}

function StepperButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9 rounded-full border border-[var(--cd-line)] text-[length:var(--cd-body)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
