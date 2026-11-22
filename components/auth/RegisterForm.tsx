"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, FormError, TextInput } from "@/components/ui/form";
import { PASSWORD_MIN } from "@/lib/auth/password-policy";

type Kind = "advertiser" | "host";

const KINDS: Array<{ id: Kind; title: string; body: string }> = [
  { id: "advertiser", title: "Quiero anunciarme", body: "Sube tu video y elige pantallas." },
  { id: "host", title: "Tengo un negocio", body: "Instala pantallas y gana por anuncios." },
];

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<Kind>(searchParams.get("tipo") === "host" ? "host" : "advertiser");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          orgName: form.get("orgName"),
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la cuenta.");
        return;
      }
      router.replace(data.next ?? "/");
      router.refresh();
    } catch {
      setError("Sin conexión. No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Tipo de cuenta</legend>
        {KINDS.map((k) => {
          const active = kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={active}
              onClick={() => setKind(k.id)}
              className={[
                "rounded-[var(--cd-radius-md)] border p-4 text-left transition-colors",
                active
                  ? "border-[var(--cd-ink)] bg-[var(--cd-bg)]"
                  : "border-[var(--cd-line)] bg-[var(--cd-surface)] hover:bg-[var(--cd-bg)]",
              ].join(" ")}
            >
              <span className="block text-[length:var(--cd-body)] font-medium">{k.title}</span>
              <span className="mt-1 block text-[length:var(--cd-small)] text-[var(--cd-muted)]">{k.body}</span>
            </button>
          );
        })}
      </fieldset>

      <Field label={kind === "advertiser" ? "Marca o negocio" : "Nombre de tu negocio"}>
        <TextInput name="orgName" required autoComplete="organization" maxLength={80} />
      </Field>
      <Field label="Tu nombre">
        <TextInput name="name" required autoComplete="name" maxLength={80} />
      </Field>
      <Field label="Correo">
        <TextInput name="email" type="email" required autoComplete="email" inputMode="email" />
      </Field>
      <Field label="Contraseña" hint={`Al menos ${PASSWORD_MIN} caracteres.`}>
        <TextInput
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
        />
      </Field>
      <FormError>{error}</FormError>
      <Button type="submit" disabled={loading}>
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
