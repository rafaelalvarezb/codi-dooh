"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { LeadSchema } from "@/lib/leads-schema";
import { IconCheck } from "./icons";

type Errors = Partial<Record<"name" | "business" | "phone" | "email" | "city" | "spaces" | "message" | "form", string>>;

const input =
  "h-12 w-full rounded-[14px] border border-[#e2e3e7] bg-[#f7f7f8] px-4 text-[16px] text-[#0a0a0b] outline-none transition placeholder:text-[#a1a1a8] focus:border-[#0a0a0b] focus:bg-white aria-[invalid=true]:border-[#d12f35]";

export function LeadForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = LeadSchema.safeParse(raw);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form") as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrors({ form: data.error ?? "No se pudo enviar. Intenta de nuevo." });
        return;
      }
      setSent(true);
    } catch {
      setErrors({ form: "Sin conexión. Intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center" role="status">
        <span className="grid size-16 place-items-center rounded-full bg-[var(--cb-go-soft)] text-[#0f8f45]">
          <IconCheck className="size-8" />
        </span>
        <p className="mt-6 text-[28px] font-semibold tracking-[-0.03em]">¡Gracias!</p>
        <p className="mt-2 max-w-xs text-[16px] text-[var(--cb-muted)]">
          Te escribimos en menos de 24 horas para agendar tu demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Tu nombre" error={errors.name}>
        <input name="name" autoComplete="name" className={input} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Estacionamiento o negocio" error={errors.business}>
        <input name="business" autoComplete="organization" className={input} aria-invalid={!!errors.business} />
      </Field>
      <Field label="Teléfono o WhatsApp" error={errors.phone}>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="55 1234 5678"
          className={input}
          aria-invalid={!!errors.phone}
        />
      </Field>
      <Field label="Correo (opcional)" error={errors.email}>
        <input name="email" type="email" autoComplete="email" className={input} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Ciudad" error={errors.city}>
        <input name="city" autoComplete="address-level2" placeholder="CDMX" className={input} aria-invalid={!!errors.city} />
      </Field>
      <Field label="¿Cuántos cajones?" error={errors.spaces}>
        <input name="spaces" inputMode="numeric" placeholder="120" className={input} aria-invalid={!!errors.spaces} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="¿Algo que debamos saber? (opcional)" error={errors.message}>
          <textarea
            name="message"
            rows={3}
            className={`${input} h-auto resize-none py-3`}
            aria-invalid={!!errors.message}
          />
        </Field>
      </div>
      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No llenar
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[var(--cb-muted)]">
          Solo usamos tus datos para contactarte.{" "}
          <a href="/sitio/privacidad" className="underline underline-offset-2 hover:text-[var(--cb-ink)]">
            Aviso de privacidad
          </a>
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[var(--cb-ink)] px-7 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Agenda una demo"}
        </button>
      </div>
      {errors.form ? (
        <p role="alert" className="text-[14px] text-[#d12f35] sm:col-span-2">
          {errors.form}
        </p>
      ) : null}
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[var(--cb-ink-2)]">{label}</span>
      {children}
      {error ? <span className="text-[13px] text-[#d12f35]">{error}</span> : null}
    </label>
  );
}
