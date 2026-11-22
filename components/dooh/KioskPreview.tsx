"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CreativeSurface } from "@/components/dooh/CreativeSurface";
import { KIOSK_FRAME } from "@/lib/video/rules";

/**
 * Pixel-exact replica of the kiosk at its native 1280×800 frame, scaled to
 * fit. Same grid as components/KioskShell.tsx (`minmax(0,1fr) 420px`, 16 px
 * padding) and the same CreativeSurface as the player, so the crop the
 * advertiser sees is the crop that plays.
 */
export function KioskPreview({
  src,
  poster,
  showSafeZone = true,
}: {
  src: string;
  poster?: string | null;
  showSafeZone?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / KIOSK_FRAME.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-[var(--cd-radius-md)] bg-[#E9E9EC]"
      style={{ aspectRatio: `${KIOSK_FRAME.width} / ${KIOSK_FRAME.height}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: KIOSK_FRAME.width, height: KIOSK_FRAME.height, transform: `scale(${scale})` }}
        aria-label="Vista previa del kiosco"
      >
        <div
          className="flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-[var(--cd-night)]"
          style={{ padding: KIOSK_FRAME.padding }}
        >
          <div
            className="grid min-h-0 flex-1 overflow-hidden rounded-[26px]"
            style={{ gridTemplateColumns: `minmax(0,1fr) ${KIOSK_FRAME.panel}px` }}
          >
            <div className="relative h-full min-h-0 overflow-hidden bg-black">
              <CreativeSurface src={src} poster={poster} loop />
              {showSafeZone ? (
                <div className="pointer-events-none absolute inset-[6%] rounded-[20px] border-2 border-dashed border-white/70">
                  <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 font-mono text-[18px] text-white">
                    ZONA SEGURA
                  </span>
                </div>
              ) : null}
            </div>
            <PanelMock />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static stand-in for the CoDi panel (contraste variant, see design/SPEC.md). */
function PanelMock() {
  return (
    <div className="flex h-full flex-col bg-[var(--cd-bg)]" aria-hidden>
      <div className="flex flex-col items-center bg-[var(--cd-night)] px-8 pt-7 pb-6 text-center">
        <Image
          src="/brand/codi-logo.png"
          alt=""
          width={72}
          height={72}
          className="rounded-[16px] outline outline-1 outline-white/20"
        />
        <p className="mt-4 text-[20px] text-white">
          <span className="font-medium">Paga con CoDi</span>
          <span className="text-[var(--cd-night-muted)]"> · Banco de México</span>
        </p>
        <p className="mt-3 text-[13px] text-[var(--cd-night-muted)]">Pago de estacionamiento</p>
        <p className="text-[48px] leading-tight font-medium text-white tabular-nums">
          $25.00 <span className="font-mono text-[12px] text-[var(--cd-night-muted)]">MXN</span>
        </p>
        <div className="mt-3 grid h-[236px] w-[236px] place-items-center rounded-[16px] bg-white p-3">
          <div className="h-full w-full rounded-[6px] bg-[repeating-conic-gradient(#0A0A0B_0_25%,#fff_0_50%)] [background-size:20px_20px] opacity-85" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-8 pt-6">
        <p className="text-[20px] font-medium">Solo con la app de tu banco</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] font-medium">
          <span className="rounded-full bg-[var(--cd-success-soft)] px-4 py-3 text-[var(--cd-success)]">App del banco: sí</span>
          <span className="rounded-full bg-[var(--cd-danger-soft)] px-4 py-3 text-[var(--cd-danger)]">Cámara: no</span>
        </div>
        <p className="mt-4 text-[13px] text-[var(--cd-ink-2)]">Abre tu banco › Transferir › Escanea › Confirma</p>
      </div>
    </div>
  );
}
