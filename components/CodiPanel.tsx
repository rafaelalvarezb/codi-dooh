"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { KioskProfile } from "@/lib/kiosk-profile";
import type { CreateQrResponse, PaymentStatusResponse } from "@/lib/types";

type PanelState = "standby" | "checkout" | "creating" | "awaiting" | "success" | "error";

interface CodiPanelProps {
  profile: KioskProfile;
  /** Dynamic profiles start in standby until ticket/amount arrives. */
  sessionActive: boolean;
  onStartSession?: () => void;
  onEndSession?: () => void;
}

function formatMxn(amount: number): string {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function formatStamp(date: Date): { folioHint: string; fecha: string; hora: string } {
  const fecha = date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const hora = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { folioHint: "", fecha, hora };
}

export function CodiPanel({
  profile,
  sessionActive,
  onStartSession,
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

  useEffect(() => {
    if (profile.billingMode === "fixed") {
      setState("checkout");
      return;
    }
    if (sessionActive) {
      setState("checkout");
      return;
    }
    // Dynamic + no ticket/amount yet
    setState("standby");
    setQr(null);
    setErrorMessage(null);
    setPaidAt(null);
    setTransactionId(null);
    startedRef.current = false;
    stopPolling();
  }, [profile.id, profile.billingMode, sessionActive]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

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
    if (state === "standby") {
      startedRef.current = false;
    }
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
        if (!res.ok) return;
        if (data.paid) {
          stopPolling();
          setTransactionId(data.transactionId ?? qrId);
          setPaidAt(new Date());
          setState("success");
          window.setTimeout(() => {
            // Auto-return keeps bathroom ready and parking back to standby.
            handleNewPayment();
          }, 4000);
        }
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
    : qr?.numRef ?? "—";

  return (
    <aside className="relative flex h-full min-h-0 flex-col border-l border-[var(--cd-border)] bg-[var(--cd-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--cd-border)] px-6 py-4">
        <Image
          src="/brand/codi-logo.png"
          alt="CoDi"
          width={112}
          height={112}
          className="h-10 w-10 rounded-[10px] object-cover"
          priority
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cd-text-muted)]">
          Sin comisión
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
        {state === "standby" ? (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--cd-text)]">
                {profile.standbyTitle}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--cd-text-secondary)]">
                {profile.standbyBody}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface-muted)] px-4 py-4">
              <p className="text-[12px] font-medium text-[var(--cd-text-muted)]">
                Listo para cobrar
              </p>
              <p className="mt-1 text-[15px] font-medium text-[var(--cd-text)]">
                Escanea el QR CoDi® desde la app de tu banco cuando aparezca el
                monto.
              </p>
              {onStartSession ? (
                <button
                  type="button"
                  onClick={onStartSession}
                  className="mt-4 w-full rounded-xl bg-[var(--cd-accent)] px-4 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
                >
                  Simular boleto / monto
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {(state === "checkout" ||
          state === "creating" ||
          state === "awaiting" ||
          state === "error") && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--cd-text-muted)]">
                Concepto
              </p>
              <h2 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-[var(--cd-text)]">
                {profile.serviceTitle}
              </h2>
              <p className="mt-5 text-[13px] font-medium text-[var(--cd-text-muted)]">
                Total a pagar
              </p>
              <p className="mt-1 font-semibold tracking-tight text-[var(--cd-text)] text-[42px] leading-none">
                {amountLabel}
              </p>
            </div>

            <div className="mt-6 flex min-h-0 flex-1 flex-col items-center justify-center">
              {state === "creating" ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-11 w-11 animate-spin rounded-full border-2 border-[var(--cd-border)] border-t-[var(--cd-accent)]" />
                  <p className="text-sm text-[var(--cd-text-secondary)]">
                    Preparando tu código CoDi…
                  </p>
                </div>
              ) : null}

              {state === "awaiting" && qr ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <div className="rounded-2xl border border-[var(--cd-border)] bg-white p-3 shadow-[0_8px_30px_rgba(11,15,20,0.06)]">
                    {qr.qrImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${qr.qrImage}`}
                        alt="Código QR CoDi"
                        className="h-48 w-48 rounded-xl"
                      />
                    ) : (
                      <QrFallback payload={qr.qrString} />
                    )}
                  </div>
                  <p className="max-w-[26ch] text-center text-[15px] font-medium leading-snug text-[var(--cd-text)]">
                    Escanea el QR CoDi® desde la app de tu banco
                  </p>
                  <p className="animate-soft-pulse text-[13px] text-[var(--cd-text-muted)]">
                    Esperando tu pago…
                  </p>
                </div>
              ) : null}

              {state === "error" ? (
                <div className="w-full rounded-2xl border border-transparent bg-[var(--cd-danger-soft)] px-4 py-3 text-sm text-[var(--cd-danger)]">
                  {errorMessage}
                  <button
                    type="button"
                    onClick={() => {
                      startedRef.current = false;
                      void createQr();
                    }}
                    className="mt-3 block w-full rounded-xl bg-[var(--cd-accent)] px-4 py-3 text-[14px] font-semibold text-white"
                  >
                    Reintentar
                  </button>
                </div>
              ) : null}

              {state === "checkout" && !profile.autoStartQr ? (
                <button
                  type="button"
                  onClick={() => void createQr()}
                  className="mt-auto flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--cd-accent)] px-5 py-4 text-white transition hover:opacity-90 active:scale-[0.99]"
                >
                  <Image
                    src="/brand/codi-logo.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-md object-cover"
                  />
                  <span className="text-[16px] font-semibold">
                    Pagar con CoDi · {amountLabel}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        )}

        {state === "success" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div
              className="animate-success-pop flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "var(--cd-success-soft)" }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-10 w-10"
                style={{ color: "var(--cd-success)" }}
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
            <p className="mt-5 text-[28px] font-semibold tracking-tight text-[var(--cd-text)]">
              {profile.successMessage}
            </p>
            <div className="mt-6 w-full rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface-muted)] px-4 py-3 text-left text-[13px] text-[var(--cd-text-secondary)]">
              <div className="flex justify-between gap-3">
                <span>Folio</span>
                <span className="font-mono font-medium text-[var(--cd-text)]">
                  {folio}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span>Fecha</span>
                <span className="font-medium text-[var(--cd-text)]">
                  {stamp?.fecha ?? "—"}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span>Hora</span>
                <span className="font-medium text-[var(--cd-text)]">
                  {stamp?.hora ?? "—"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNewPayment}
              className="mt-6 rounded-xl border border-[var(--cd-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--cd-text)]"
            >
              Listo
            </button>
          </div>
        ) : null}
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
      <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-[var(--cd-surface-muted)] text-xs text-[var(--cd-text-muted)]">
        Preparando QR…
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Código QR CoDi" className="h-48 w-48 rounded-xl" />;
}
