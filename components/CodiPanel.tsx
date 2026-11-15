"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { KioskProfile } from "@/lib/kiosk-profile";
import type { CreateQrResponse, PaymentStatusResponse } from "@/lib/types";

type PanelState =
  | "standby"
  | "creating"
  | "esperando"
  | "confirmando"
  | "recibido"
  | "rechazado"
  | "vencido"
  | "no-disponible";

interface CodiPanelProps {
  profile: KioskProfile;
  sessionActive: boolean;
  onEndSession?: () => void;
  machineId?: string;
}

function formatMxn(amount: number): string {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function formatTimer(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  machineId,
}: CodiPanelProps) {
  const [state, setState] = useState<PanelState>(
    profile.billingMode === "fixed" || sessionActive ? "creating" : "standby",
  );
  const [qr, setQr] = useState<CreateQrResponse | null>(null);
  const [paidAt, setPaidAt] = useState<Date | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const relayFiredRef = useRef(false);
  const confirmingRef = useRef(false);

  useEffect(() => {
    if (profile.billingMode === "fixed" || sessionActive) {
      if (!startedRef.current) {
        startedRef.current = true;
        void createQr();
      }
      return;
    }
    setState("standby");
    setQr(null);
    setPaidAt(null);
    setTransactionId(null);
    startedRef.current = false;
    relayFiredRef.current = false;
    confirmingRef.current = false;
    stopPolling();
    stopTimer();
  }, [profile.id, profile.billingMode, sessionActive]);

  useEffect(() => () => {
    stopPolling();
    stopTimer();
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startExpiryTimer(expiresIn: number) {
    stopTimer();
    setSecondsLeft(expiresIn);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          stopPolling();
          setState("vencido");
          window.setTimeout(() => {
            startedRef.current = false;
            void createQr();
          }, 1600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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

        if (!confirmingRef.current) {
          confirmingRef.current = true;
          setState("confirmando");
        }

        stopPolling();
        stopTimer();
        setTransactionId(data.transactionId ?? qrId);
        setPaidAt(new Date());
        setState("recibido");

        if (!relayFiredRef.current) {
          relayFiredRef.current = true;
          void triggerRelay(`codi_paid:${qrId}`);
        }

        window.setTimeout(() => handleNewPayment(), 8000);
      } catch {
        /* keep waiting */
      }
    };
    void tick();
    pollRef.current = window.setInterval(() => void tick(), 2500);
  }

  async function createQr() {
    setState("creating");
    setQr(null);
    stopPolling();
    stopTimer();
    relayFiredRef.current = false;
    confirmingRef.current = false;
    try {
      const res = await fetch("/api/codi/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useCaseId: profile.useCaseId,
          machineId: machineId ?? profile.id,
        }),
      });
      const data = (await res.json()) as CreateQrResponse & {
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? "No se pudo generar el QR.");
      }
      setQr(data);
      setState("esperando");
      startExpiryTimer(data.expiration ?? 300);
      startPolling(data.qrId);
    } catch {
      setState("no-disponible");
      startedRef.current = false;
    }
  }

  function handleNewPayment() {
    stopPolling();
    stopTimer();
    setQr(null);
    setPaidAt(null);
    setTransactionId(null);
    startedRef.current = false;
    relayFiredRef.current = false;
    confirmingRef.current = false;
    if (profile.billingMode === "fixed") {
      void createQr();
    } else {
      setState("standby");
      onEndSession?.();
    }
  }

  const amountLabel = formatMxn(profile.amountMxn);
  const folio = transactionId
    ? transactionId.slice(-8).toUpperCase()
    : (qr?.numRef ?? "—");
  const hora = paidAt
    ? paidAt.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  if (state === "standby") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col px-10 pt-8">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/codi-logo.png"
              alt="CoDi"
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover"
              priority
            />
            <div>
              <p className="text-[24px] font-medium tracking-[-0.015em] text-[var(--cd-ink)]">
                Paga con CoDi
              </p>
              <p className="text-[13px] text-[var(--cd-muted)]">
                Sistema del Banco de México
              </p>
            </div>
          </div>
          <h2 className="mt-8 text-[30px] font-medium tracking-[-0.02em] text-[var(--cd-ink)]">
            {profile.standbyTitle}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--cd-ink-2)]">
            {profile.standbyBody}
          </p>
          <div className="mt-auto pb-6">
            <p className="mb-3 text-[15px] font-medium text-[var(--cd-ink)]">
              Solo con la app de tu banco
            </p>
            <ContrastCompare />
          </div>
        </div>
      </aside>
    );
  }

  if (state === "creating") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--cd-accent-soft)]">
            <div className="h-9 w-9 animate-cd-spin rounded-full border-[3px] border-[rgba(43,80,255,0.2)] border-t-[var(--cd-accent)]" />
          </div>
          <p className="mt-7 text-[30px] font-medium tracking-[-0.02em]">
            Generando código
          </p>
          <p className="mt-2 text-[15px] text-[var(--cd-muted)]">
            Un momento…
          </p>
        </div>
      </aside>
    );
  }

  if (state === "confirmando") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--cd-accent-soft)]">
            <div className="h-9 w-9 animate-cd-spin rounded-full border-[3px] border-[rgba(43,80,255,0.2)] border-t-[var(--cd-accent)]" />
          </div>
          <p className="mt-7 text-[30px] font-medium tracking-[-0.02em]">
            Confirmando pago
          </p>
          <p className="mt-2 text-[20px] text-[var(--cd-ink-2)]">
            {amountLabel} MXN
          </p>
        </div>
      </aside>
    );
  }

  if (state === "recibido") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col items-center px-10 pt-20 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--cd-success-soft)]">
            <svg
              viewBox="0 0 24 24"
              className="h-11 w-11 text-[var(--cd-success)]"
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
          <p className="mt-7 text-[30px] font-medium tracking-[-0.02em]">
            Pago recibido
          </p>
          <p className="mt-2 text-[20px] text-[var(--cd-ink-2)]">
            {profile.successMessage}
          </p>
          <div className="mt-9 w-full rounded-2xl bg-[var(--cd-surface)] px-5 py-4 text-left text-[13px]">
            <ReceiptRow
              label="Concepto"
              value={`${profile.serviceTitle} · ${amountLabel}`}
            />
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-[var(--cd-muted)]">Método</span>
              <span className="flex items-center gap-2 font-medium">
                <Image
                  src="/brand/codi-logo.png"
                  alt="CoDi"
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-[5px] object-cover"
                />
                CoDi
              </span>
            </div>
            <ReceiptRow label="Referencia" value={folio} mono />
            <ReceiptRow label="Hora" value={hora} mono />
          </div>
        </div>
        <div className="px-10 pb-7">
          <div className="h-[3px] overflow-hidden rounded-full bg-[var(--cd-line)]">
            <div className="h-full w-full origin-left animate-cd-bar bg-[var(--cd-success)]" />
          </div>
        </div>
      </aside>
    );
  }

  if (state === "rechazado") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--cd-danger-soft)] text-[32px] text-[var(--cd-danger)]">
            ✕
          </div>
          <p className="mt-7 text-[30px] font-medium tracking-[-0.02em]">
            No se completó el pago
          </p>
          <p className="mt-2 max-w-[28ch] text-[15px] leading-relaxed text-[var(--cd-muted)]">
            Tu banco no confirmó la transferencia.
          </p>
        </div>
        <div className="px-10 pb-7">
          <div className="h-[3px] overflow-hidden rounded-full bg-[var(--cd-line)]">
            <div className="h-full w-full origin-left animate-cd-bar bg-[var(--cd-ink)]" />
          </div>
        </div>
      </aside>
    );
  }

  if (state === "vencido") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--cd-surface)] text-[28px] text-[var(--cd-muted)]">
            ◷
          </div>
          <p className="mt-7 text-[30px] font-medium tracking-[-0.02em]">
            El código venció
          </p>
          <p className="mt-2 text-[15px] text-[var(--cd-muted)]">
            Generando uno nuevo
          </p>
        </div>
      </aside>
    );
  }

  if (state === "no-disponible") {
    return (
      <aside className="cd-panel relative flex h-full min-h-0 flex-col border-l border-[var(--cd-line)]">
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--cd-surface)] text-[28px] text-[var(--cd-muted)]">
            ⊘
          </div>
          <p className="mt-7 text-[30px] font-medium tracking-[-0.02em] text-balance">
            CoDi no está disponible por ahora
          </p>
          <p className="mt-2 text-[15px] text-[var(--cd-muted)]">
            Usa otro método de pago.
          </p>
          <button
            type="button"
            onClick={() => {
              startedRef.current = false;
              void createQr();
            }}
            className="mt-8 min-h-[56px] w-full rounded-2xl bg-[var(--cd-ink)] px-4 text-[15px] font-medium text-white"
          >
            Reintentar
          </button>
        </div>
      </aside>
    );
  }

  /* esperando — variante contraste (producción) */
  return (
    <aside className="cd-panel relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[var(--cd-line)]">
      <div className="flex shrink-0 flex-col items-center bg-[var(--cd-night)] px-8 pb-6 pt-7 text-center text-white">
        <Image
          src="/brand/codi-logo.png"
          alt="CoDi"
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-2xl object-cover ring-1 ring-white/20"
          priority
        />
        <p className="mt-4 text-[20px] font-medium tracking-[-0.015em]">
          Paga con CoDi
          <span className="font-normal text-[var(--cd-night-muted)]">
            {" "}
            · Banco de México
          </span>
        </p>
        <p className="mt-3 text-[13px] text-[var(--cd-night-muted)]">
          {profile.serviceTitle}
        </p>
        <p className="mt-1">
          <span className="text-[48px] font-medium leading-none tracking-[-0.035em]">
            {amountLabel}
          </span>
          <span className="ml-1.5 font-mono text-[12px] text-[var(--cd-night-muted)]">
            MXN
          </span>
        </p>
        <div className="mt-5 rounded-2xl bg-white p-3">
          {qr?.qrImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${qr.qrImage}`}
              alt="Código QR CoDi"
              className="h-[236px] w-[236px]"
            />
          ) : qr ? (
            <QrFallback payload={qr.qrString} size={236} />
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[var(--cd-bg)] px-8 pt-5">
        <p className="text-[20px] font-medium tracking-[-0.015em] text-[var(--cd-ink)]">
          Solo con la app de tu banco
        </p>
        <ContrastCompare />
        <p className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--cd-ink-2)]">
          <span>Abre tu banco</span>
          <span className="text-[var(--cd-subtle)]">›</span>
          <span>Transferir</span>
          <span className="text-[var(--cd-subtle)]">›</span>
          <strong className="font-medium text-[var(--cd-ink)]">Escanea</strong>
          <span className="text-[var(--cd-subtle)]">›</span>
          <span>Confirma</span>
        </p>
        <div className="flex-1" />
        <div className="flex items-center justify-between border-t border-[var(--cd-line)] py-4 pb-5">
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--cd-ink)]">
            <span className="h-2 w-2 animate-cd-pulse rounded-full bg-[var(--cd-accent)]" />
            Esperando pago
          </div>
          <div className="font-mono text-[13px] text-[var(--cd-muted)]">
            Vence en {formatTimer(secondsLeft)}
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Sí primero (banco), No después (cámara) — alineado al feedback de prueba. */
function ContrastCompare() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--cd-success-soft)] px-3 py-2.5">
        <BankIcon />
        <div>
          <b className="block text-[13px] font-medium text-[var(--cd-ink)]">
            App del banco
          </b>
          <span className="text-[12px] text-[var(--cd-ink-2)]">Así sí</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--cd-danger-soft)] px-3 py-2.5">
        <CameraOffIcon />
        <div>
          <b className="block text-[13px] font-medium text-[var(--cd-ink)]">
            Cámara
          </b>
          <span className="text-[12px] text-[var(--cd-ink-2)]">No</span>
        </div>
      </div>
    </div>
  );
}

function CameraOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0 text-[var(--cd-danger)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M2 2l20 20" />
      <path d="M7 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14" />
      <path d="M17 17v-1" />
      <path d="M9.5 4H15l2 3h2a2 2 0 0 1 2 2v3" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0 text-[var(--cd-success)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10h18" />
      <path d="M5 10v8" />
      <path d="M9 10v8" />
      <path d="M15 10v8" />
      <path d="M19 10v8" />
      <path d="M2 18h20" />
      <path d="M12 3l9 7H3l9-7z" />
    </svg>
  );
}

function ReceiptRow({
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
      <span className="text-[var(--cd-muted)]">{label}</span>
      <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
    </div>
  );
}

function QrFallback({
  payload,
  size = 236,
}: {
  payload: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: size,
        color: { dark: "#0A0A0B", light: "#ffffff" },
      });
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!src) {
    return (
      <div
        className="flex items-center justify-center bg-[var(--cd-surface)] text-sm text-[var(--cd-muted)]"
        style={{ width: size, height: size }}
      >
        Preparando QR…
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="Código QR CoDi"
      className="block"
      style={{ width: size, height: size }}
    />
  );
}
