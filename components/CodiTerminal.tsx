"use client";

import { useEffect, useRef, useState } from "react";
import { HACKATHON_AMOUNT_MXN } from "@/lib/use-cases";
import type {
  CreateQrResponse,
  PaymentPhase,
  PaymentStatusResponse,
  UseCaseConfig,
} from "@/lib/types";

interface CodiTerminalProps {
  useCase: UseCaseConfig;
  onBusyChange?: (busy: boolean) => void;
}

function formatMxn(amount: number): string {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

export function CodiTerminal({ useCase, onBusyChange }: CodiTerminalProps) {
  const [phase, setPhase] = useState<PaymentPhase>("idle");
  const [qr, setQr] = useState<CreateQrResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [relayPulse, setRelayPulse] = useState(false);
  const pollRef = useRef<number | null>(null);

  const busy = phase === "creating" || phase === "awaiting";

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    // Reset flow when use case changes (unless mid-payment — parent locks selector).
    if (!busy) {
      setPhase("idle");
      setQr(null);
      setErrorMessage(null);
      setRelayPulse(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional reset on useCase.id only when idle
  }, [useCase.id]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(qrId: string) {
    stopPolling();

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/codi/status?qrId=${encodeURIComponent(qrId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as PaymentStatusResponse & {
          error?: { message?: string };
        };

        if (!res.ok) return;

        if (data.paid) {
          stopPolling();
          setPhase("success");
          setRelayPulse(true);
          window.setTimeout(() => setRelayPulse(false), 1800);
        }
      } catch {
        // Keep waiting — transient network blips shouldn't kill the session.
      }
    };

    void tick();
    pollRef.current = window.setInterval(() => {
      void tick();
    }, 2500);
  }

  async function handlePay() {
    setErrorMessage(null);
    setPhase("creating");
    setQr(null);
    stopPolling();

    try {
      const res = await fetch("/api/codi/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCaseId: useCase.id }),
      });

      const data = (await res.json()) as CreateQrResponse & {
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(
          data.error?.message ?? "No se pudo generar el QR de CoDi.",
        );
      }

      setQr(data);
      setPhase("awaiting");
      startPolling(data.qrId);
    } catch (error) {
      setPhase("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado.",
      );
    }
  }

  function handleReset() {
    stopPolling();
    setPhase("idle");
    setQr(null);
    setErrorMessage(null);
    setRelayPulse(false);
  }

  const amountLabel = formatMxn(HACKATHON_AMOUNT_MXN);

  return (
    <aside className="relative flex h-full min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${useCase.accentSoft}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex h-full flex-col px-6 py-6">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Terminal CoDi · Pey
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
            {useCase.serviceTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{useCase.ticketLabel}</p>
        </div>

        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Monto de prueba</span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              0% comisión
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white">
            {amountLabel}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Cobro real vía API Pey · liquidación SPEI instantánea a cuenta
            bancaria.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {phase === "idle" || phase === "error" ? (
            <div className="flex flex-1 flex-col justify-end gap-4">
              {phase === "error" && errorMessage ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handlePay()}
                className="group relative overflow-hidden rounded-2xl bg-zinc-50 px-5 py-4 text-left transition-transform duration-200 hover:scale-[1.015] active:scale-[0.985]"
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at 30% 50%, ${useCase.accentSoft}, transparent 55%)`,
                  }}
                />
                <span className="relative block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Pagar con CoDi
                </span>
                <span className="relative mt-1 block text-lg font-semibold text-zinc-950">
                  {amountLabel}
                </span>
              </button>
            </div>
          ) : null}

          {phase === "creating" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Generando QR seguro…
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Conectando con Pey · Banxico CoDi
                </p>
              </div>
            </div>
          ) : null}

          {phase === "awaiting" && qr ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5">
              <div className="relative rounded-3xl border border-zinc-700 bg-white p-3 shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                {qr.qrImage ? (
                  // Pey returns base64 PNG when generateImage=true
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${qr.qrImage}`}
                    alt="Código QR CoDi"
                    className="h-48 w-48 rounded-2xl"
                  />
                ) : (
                  <QrFallback payload={qr.qrString} />
                )}
                <div className="pointer-events-none absolute -inset-1 rounded-[1.65rem] border border-white/10" />
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-zinc-100">
                  Escanea con tu app bancaria
                </p>
                <p className="mt-1 animate-pulse text-xs text-zinc-400">
                  Esperando confirmación SPEI instantánea…
                </p>
                <p className="mt-3 font-mono text-[10px] text-zinc-600">
                  Ref {qr.numRef} · IDC {qr.qrId}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-500 underline-offset-4 transition hover:text-zinc-300 hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : null}

          {phase === "success" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <div className="relative">
                <div
                  className={[
                    "flex h-24 w-24 items-center justify-center rounded-full border",
                    "border-emerald-400/40 bg-emerald-400/10",
                    relayPulse
                      ? "animate-ping-once shadow-[0_0_60px_rgba(52,211,153,0.55)]"
                      : "shadow-[0_0_40px_rgba(52,211,153,0.25)]",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-12 w-12 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                {relayPulse ? (
                  <span
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ background: useCase.accentSoft }}
                  />
                ) : null}
              </div>

              <div>
                <p className="text-xl font-semibold text-zinc-50">
                  Pago confirmado
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {useCase.successAction}
                </p>
              </div>

              <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Simulación de relé físico
                </p>
                <p className="mt-1 text-sm text-zinc-200">{useCase.relayLabel}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full w-full origin-left animate-[pulseBar_1.2s_ease-out] rounded-full"
                    style={{ background: useCase.accent }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                Nuevo cobro
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-5 text-center text-[10px] tracking-wide text-zinc-600">
          Powered by Pey · CoDi Banxico · DOOH RevShare
        </p>
      </div>
    </aside>
  );
}

function QrFallback({ payload }: { payload: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 256,
        color: { dark: "#09090b", light: "#ffffff" },
      });
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!src) {
    return (
      <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-zinc-100 text-xs text-zinc-500">
        Preparando QR…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Código QR CoDi" className="h-48 w-48 rounded-2xl" />
  );
}
