"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@codidooh.mx");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      router.replace("/portal");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[var(--cd-muted)]">
          Correo
        </span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-[var(--cd-line)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[var(--cd-accent)]"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[var(--cd-muted)]">
          Contraseña
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-[var(--cd-line)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[var(--cd-accent)]"
        />
      </label>
      {error ? (
        <p className="text-[13px] text-[var(--cd-danger)]">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-xl bg-[var(--cd-ink)] px-4 py-3 text-[15px] font-medium text-white disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-[12px] text-[var(--cd-subtle)]">
        Demo: admin@codidooh.mx / codidooh (o vars PORTAL_ADMIN_*)
      </p>
    </form>
  );
}
