"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { KioskProfile } from "@/lib/kiosk-profile";
import type { CreateQrResponse, PaymentStatusResponse } from "@/lib/types";

type PanelState =
  | "standby"
  | "checkout"
  | "creating"
  | "awaiting"
  | "success"
  | "error";

interface CodiPanelProps {
  profile: KioskProfile;
  sessionActive: boolean;
  onEndSession?: () => void;
}

function formatMxn(amount: number): string {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function formatStamp(date: Date): { fecha: string; hora: string } {
  return {
    fecha: date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    hora: date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

async function triggerRelay(reason: string) {
  try {
    await fetch("/api/relay/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMs: 3000, reason }),
    });
  } catch {
    /* never block success UI on relay failure */
  }
}

export function CodiPanel({
  profile,
  sessionActive,
  onEndSession,
}: CodiPanelProps) {
  const [state, setState] = useState<PanelState>(
    profile.billingMode === "fixed" ? "checkout" : "standby",
  );
  const [qr, setQr] = useState<CreateQrResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<Date | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const relayFiredRef = useRef(false);

  useEffect(() => {
    if (profile.billingMode === "fixed") {
      setState("checkout");
      return;
    }
    if (sessionActive) {
      setState("checkout");
      return;
    }
    setState("standby");
    setQr(null);
    setErrorMessage(null);
    setPaidAt(null);
    setTransactionId(null);
    startedRef.current = false;
    relayFiredRef.current = false;
    stopPolling();
  }, [profile.id, profile.billingMode, sessionActive]);

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (
      state === "checkout" &&
      profile.autoStartQr &&
      !startedRef.current &&
      !qr
    ) {
      startedRef.current = true;
      void createQr();
    }
    if (state === "standby") startedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, profile.autoStartQr]);

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
        const data = (await res.json()) as PaymentStatusResponse;
        if (!res.ok || !data.paid) return;

        stopPolling();
        setTransactionId(data.transactionId ?? qrId);
        setPaidAt(new Date());
        setState("success");

        if (!relayFiredRef.current) {
          relayFiredRef.current = true;
          void triggerRelay(`codi_paid:${qrId}`);
        }

        window.setTimeout(() => handleNewPayment(), 4200);
      } catch {
        /* keep waiting */
      }
    };
    void tick();
    pollRef.current = window.setInterval(() => void tick(), 2500);
  }

  async function createQr() {
    setErrorMessage(null);
    setState("creating");
    setQr(null);
    stopPolling();
    relayFiredRef.current = false;
    try {
      const res = await fetch("/api/codi/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCaseId: profile.useCaseId }),
      });
      const data = (await res.json()) as CreateQrResponse & {
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? "No se pudo generar el QR.");
      }
      setQr(data);
      setState("awaiting");
      startPolling(data.qrId);
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado.",
      );
      startedRef.current = false;
    }
  }

  function handleNewPayment() {
    stopPolling();
    setQr(null);
    setPaidAt(null);
    setTransactionId(null);
    setErrorMessage(null);
    startedRef.current = false;
    relayFiredRef.current = false;
    if (profile.billingMode === "fixed") {
      setState("checkout");
    } else {
      setState("standby");
      onEndSession?.();
    }
  }

  const amountLabel = formatMxn(profile.amountMxn);
  const stamp = paidAt ? formatStamp(paidAt) : null;
  const folio = transactionId
    ? transactionId.slice(-8).toUpperCase()
    : (qr?.numRef ?? "—");

  return (
    <aside
      className="codi-pay-panel relative flex h-full min-h-0 flex-col border-l border-zinc-200 bg-white"
      style={{ color: "#0B0F14", backgroundColor: "#FFFFFF" }}
    >
      <div className="flex items-center gap-3 border-b border-zinc-200 px-7 py-5">
        <Image
          src="/brand/codi-logo.png"
          alt="CoDi"
          width={128}
          height={128}
          className="h-12 w-12 rounded-[12px] object-cover shadow-sm"
          priority
        />
        <div className="min-w-0 flex-1">
          <p className="codi-pay-title text-[17px] font-semibold tracking-tight">
            Pago con CoDi
          </p>
          <p className="codi-pay-subtitle text-[13px]">
            Transferencia segura · Sin comisión
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-7 py-7">
        {state === "standby" ? (
          <div className="flex flex-1 flex-col">
            <p className="codi-pay-muted text-[13px] font-medium uppercase tracking-[0.14em]">
              Disponible
            </p>
            <h2 className="codi-pay-title mt-2 text-[32px] font-semibold leading-[1.1] tracking-tight">
              {profile.standbyTitle}
            </h2>
            <p className="codi-pay-secondary mt-4 text-[16px] leading-relaxed">
              {profile.standbyBody}
            </p>
            <div className="mt-auto rounded-3xl bg-zinc-100 px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-zinc-950 shadow-sm">
                  1
                </span>
                <p className="codi-pay-title text-[15px] leading-snug">
                  Confirma tu boleto o monto en la máquina
                </p>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-zinc-950 shadow-sm">
                  2
                </span>
                <p className="codi-pay-title text-[15px] leading-snug">
                  Escanea el QR CoDi® desde la app de tu banco
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {(state === "checkout" ||
          state === "creating" ||
          state === "awaiting" ||
          state === "error") && (
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="codi-pay-muted text-[13px] font-medium">
              {profile.serviceTitle}
            </p>
            <p className="codi-pay-amount mt-3 text-[48px] font-semibold leading-none tracking-tight">
              {amountLabel}
            </p>

            <div className="mt-8 flex min-h-0 flex-1 flex-col items-center justify-center">
              {state === "creating" ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-950" />
                  <p className="codi-pay-secondary text-[15px]">
                    Generando código CoDi…
                  </p>
                </div>
              ) : null}

              {state === "awaiting" && qr ? (
                <div className="flex w-full flex-col items-center">
                  <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_12px_40px_rgba(11,15,20,0.08)]">
                    {qr.qrImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${qr.qrImage}`}
                        alt="Código QR CoDi"
                        className="h-56 w-56 rounded-2xl"
                      />
                    ) : (
                      <QrFallback payload={qr.qrString} />
                    )}
                  </div>
                  <p className="codi-pay-title mt-6 max-w-[22ch] text-center text-[17px] font-semibold leading-snug">
                    Escanea el QR CoDi® desde la app de tu banco
                  </p>
                  <p className="codi-pay-muted mt-2 animate-soft-pulse text-[14px]">
                    Esperando confirmación…
                  </p>
                </div>
              ) : null}

              {state === "error" ? (
                <div className="w-full rounded-3xl bg-red-50 px-5 py-4 text-[15px] text-red-700">
                  {errorMessage}
                  <button
                    type="button"
                    onClick={() => {
                      startedRef.current = false;
                      void createQr();
                    }}
                    className="mt-4 w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-[15px] font-semibold text-white"
                  >
                    Reintentar
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {state === "success" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="animate-success-pop flex h-[88px] w-[88px] items-center justify-center rounded-full bg-emerald-50">
              <svg
                viewBox="0 0 24 24"
                className="h-11 w-11 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="codi-pay-title mt-6 text-[30px] font-semibold tracking-tight">
              {profile.successMessage}
            </p>
            <p className="codi-pay-success mt-2 text-[15px] font-medium">
              Acceso liberado
            </p>

            <div className="mt-8 w-full rounded-3xl bg-zinc-100 px-5 py-4 text-left text-[14px]">
              <Row label="Folio" value={folio} mono />
              <Row label="Fecha" value={stamp?.fecha ?? "—"} />
              <Row label="Hora" value={stamp?.hora ?? "—"} />
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="codi-pay-secondary">{label}</span>
      <span
        className={[
          "codi-pay-title font-medium",
          mono ? "font-mono tracking-wide" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
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
        width: 280,
        color: { dark: "#0B0F14", light: "#ffffff" },
      });
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!src) {
    return (
      <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500">
        Preparando QR…
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Código QR CoDi" className="h-56 w-56 rounded-2xl" />;
}
