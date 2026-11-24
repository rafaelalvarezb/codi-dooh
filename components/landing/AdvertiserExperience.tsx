"use client";

import { useRef } from "react";
import { IconClose } from "./icons";

/** Seconds on a 60 s strip: when the ad played and when payments happened. */
const PLAYS = [
  [2, 14],
  [24, 36],
  [46, 58],
];
const PAYMENTS = [9, 19, 31, 41, 50];
const during = (t: number) => PLAYS.some(([a, b]) => t >= a && t <= b);

/**
 * "Ver experiencia para anunciantes": the explainer video (when
 * public/landing/experiencia-anunciantes.mp4 exists) plus the
 * "pagos durante tu anuncio" idea, explained in words.
 */
export function AdvertiserExperience({ videoSrc, posterSrc }: { videoSrc: string | null; posterSrc: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const close = () => {
    video.current?.pause();
    dialog.current?.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--cb-ink)] px-6 text-[15px] font-medium text-white transition hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l10.5-6.5z" />
        </svg>
        Ver experiencia para anunciantes
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && close()}
        onClose={() => video.current?.pause()}
        aria-labelledby="exp-title"
        className="m-auto w-[min(920px,calc(100vw-32px))] max-w-none rounded-[28px] bg-white p-0 text-[var(--cb-ink)] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-6 pt-5 sm:px-8">
          <p id="exp-title" className="text-[18px] font-semibold tracking-[-0.02em]">
            La experiencia para anunciantes
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="grid size-10 place-items-center rounded-full hover:bg-[var(--cb-bg)]"
          >
            <IconClose className="size-5" />
          </button>
        </div>

        <div className="px-6 pt-4 sm:px-8">
          {videoSrc ? (
            <video
              ref={video}
              src={videoSrc}
              poster={posterSrc ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-[18px] bg-black"
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-[18px] bg-[var(--cb-night)] text-center text-white">
              <div className="px-6">
                <p className="text-[20px] font-semibold tracking-[-0.02em]">Muy pronto: el video de la experiencia</p>
                <p className="mt-2 text-[15px] text-white/60">Mientras tanto, así funciona la métrica que solo cobten te da.</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pt-6 pb-7 sm:px-8 sm:pb-8">
          <p className="text-[17px] font-semibold tracking-[-0.02em]">Pagos durante tu anuncio</p>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--cb-muted)]">
            Ejemplo de un minuto en una pantalla. Tu anuncio pasó 3 veces (barras negras). En ese minuto, 5 personas pagaron
            su boleto con CoDi (puntos). <strong className="font-medium text-[var(--cb-ink)]">3 pagaron mientras tu anuncio estaba en pantalla</strong>{" "}
            (verdes): estaban frente a ella, con el celular en la mano, viendo tu marca. Ese número te lo damos en tu campaña.
          </p>
          <div className="relative mt-6 h-14" role="img" aria-label="Un minuto: tu anuncio pasó 3 veces y 3 de los 5 pagos ocurrieron mientras pasaba">
            <div className="absolute inset-x-0 top-[22px] h-3 rounded-full bg-[var(--cb-bg)]" />
            {PLAYS.map(([a, b]) => (
              <div
                key={a}
                className="absolute top-[22px] h-3 rounded-full bg-[var(--cb-ink)]"
                style={{ left: `${(a / 60) * 100}%`, width: `${((b - a) / 60) * 100}%` }}
              />
            ))}
            {PAYMENTS.map((t) => (
              <span
                key={t}
                className={`absolute top-[17px] size-[22px] -translate-x-1/2 rounded-full border-[3px] border-white ${during(t) ? "bg-[#0f8f45]" : "bg-[#c4c4ca]"}`}
                style={{ left: `${(t / 60) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] text-[var(--cb-muted)]">
            <span>0 s</span>
            <span>60 s</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--cb-muted)]">
            <span className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-[var(--cb-ink)]" />
              Tu anuncio en pantalla
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#0f8f45]" />
              Pagó mientras pasaba tu anuncio
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#c4c4ca]" />
              Pagó en otro momento
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
