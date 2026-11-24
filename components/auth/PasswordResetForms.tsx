"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, buttonClass, Field, FormError, TextInput } from "@/components/ui/form";
import { PASSWORD_MIN } from "@/lib/auth/password-policy";

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: { error?: string; message?: string } }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as { error?: string; message?: string } };
  } catch {
    return { ok: false, data: { error: "Sin conexión. Intenta de nuevo." } };
  }
}

export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, data } = await post("/api/auth/forgot", { email: new FormData(event.currentTarget).get("email") });
    setLoading(false);
    if (!ok) return setError(data.error ?? "No se pudo enviar el correo.");
    setSent(data.message ?? "Revisa tu correo.");
  }

  if (sent) {
    return (
      <div role="status" className="rounded-[var(--cd-radius-md)] bg-[var(--cd-success-soft)] px-4 py-4 text-[length:var(--cd-body)] text-[var(--cd-ink)]">
        {sent} Revisa también la carpeta de spam. El enlace vence en 1 hora.
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Correo de tu cuenta">
        <TextInput name="email" type="email" required autoComplete="email" inputMode="email" />
      </Field>
      <FormError>{error}</FormError>
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando…" : "Enviarme un enlace"}
      </Button>
    </form>
  );
}

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < PASSWORD_MIN) return setError(`Usa al menos ${PASSWORD_MIN} caracteres.`);
    if (password !== form.get("confirm")) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    setError(null);
    const { ok, data } = await post("/api/auth/reset", { token, password });
    setLoading(false);
    if (!ok) return setError(data.error ?? "No se pudo cambiar la contraseña.");
    setDone(true);
  }

  if (!token) {
    return (
      <p className="text-[length:var(--cd-body)] text-[var(--cd-ink-2)]">
        Este enlace está incompleto.{" "}
        <Link href="/recuperar" className="font-medium underline underline-offset-4">
          Pide uno nuevo
        </Link>
        .
      </p>
    );
  }
  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div role="status" className="rounded-[var(--cd-radius-md)] bg-[var(--cd-success-soft)] px-4 py-4 text-[length:var(--cd-body)]">
          Listo, tu contraseña cambió. Por seguridad cerramos las sesiones abiertas en otros dispositivos.
        </div>
        <Link href="/entrar" className={buttonClass("primary")}>
          Entrar
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Nueva contraseña" hint={`Al menos ${PASSWORD_MIN} caracteres.`}>
        <TextInput name="password" type="password" required autoComplete="new-password" />
      </Field>
      <Field label="Repítela">
        <TextInput name="confirm" type="password" required autoComplete="new-password" />
      </Field>
      <FormError>{error}</FormError>
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
