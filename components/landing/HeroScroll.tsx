"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { KioskMock } from "./KioskMock";
import { PhoneMock } from "./PhoneMock";
import { IconCash, IconBank } from "./icons";

/**
 * Pinned scroll scene: the kiosk settles, a phone rises to its QR, the payment
 * goes through and the barrier opens. Scroll progress is written to CSS
 * variables on the section (no React renders per frame); the phone's screen
 * and the kiosk panel switch with `data-stage`.
 */

type Stage = "intro" | "scan" | "confirm" | "done";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function stageAt(p: number): Stage {
  if (p < 0.2) return "intro";
  if (p < 0.62) return "scan";
  if (p < 0.76) return "confirm";
  return "done";
}

export function HeroScroll({ qrSvg, background }: { qrSvg: string; background?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const set = (name: string, v: number) => el.style.setProperty(name, v.toFixed(4));
    const setStage = (s: Stage) => {
      if (el.dataset.stage !== s) el.dataset.stage = s;
    };

    const apply = () => {
      raf = 0;
      if (reduce.matches) {
        el.dataset.static = "";
        set("--intro", 0);
        set("--k", 1);
        set("--rise", 1);
        set("--approach", 1);
        set("--leave", 1);
        setStage("done");
        return;
      }
      delete el.dataset.static;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp01(-r.top / total) : 1;
      set("--intro", easeInOut(seg(p, 0, 0.16)));
      set("--k", easeInOut(seg(p, 0.02, 0.3)));
      set("--rise", easeOut(seg(p, 0.2, 0.46)));
      set("--approach", easeInOut(seg(p, 0.44, 0.62)));
      // After paying, the phone steps aside so the kiosk's "Pago recibido" shows.
      set("--leave", easeInOut(seg(p, 0.8, 0.94)));
      setStage(stageAt(p));
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <section ref={ref} className="cb-hero" data-stage="intro" aria-labelledby="hero-title">
      <div className="cb-hero-sticky cb-grain">
        <div className="cb-hero-bg" aria-hidden>
          {background}
          <div className="cb-hero-glow" />
        </div>

        <div className="cb-hero-copy">
          <p className="cb-eyebrow rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-white/80 backdrop-blur">
            <span className="size-1.5 rounded-full bg-[var(--cb-go-bright)]" />
            Cobro CoDi para estacionamientos
          </p>
          <h1 id="hero-title" className="cb-display mx-auto mt-6 max-w-[14ch] text-[clamp(44px,7.4vw,100px)]">
            Pagan con su banco. <span className="text-white/45">Salen en segundos.</span>
          </h1>
          <p className="cb-lead mx-auto mt-6 max-w-[38rem] text-white/65">
            Un kiosco con QR CoDi en la salida de tu estacionamiento. Tus clientes pagan desde la app de su banco y
            la pluma se abre sola.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demo"
              className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-medium text-[var(--cb-ink)] transition hover:bg-white/90"
            >
              Agenda una demo
            </a>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[15px] font-medium text-white transition hover:bg-white/10"
            >
              Cómo funciona
            </a>
          </div>
          <div className="cb-scroll-hint mt-10 hidden flex-col items-center gap-2 text-[12px] text-white/40 sm:flex">
            <span className="flex h-8 w-5 justify-center rounded-full border border-white/25 pt-1.5">
              <span className="cb-scroll-hint-dot size-1 rounded-full bg-white/70" />
            </span>
            Desliza para verlo
          </div>
        </div>

        <div className="cb-stage">
          <div className="cb-kiosk">
            <KioskMock qrSvg={qrSvg} />
          </div>

          <div className="cb-chip cb-chip-hide-sm" style={{ left: "-4cqw", top: "9cqw" }}>
            <span className="cb-chip-icon">
              <IconCash className="size-4" />
            </span>
            Sin efectivo ni cajero
          </div>
          <div className="cb-chip cb-chip-hide-sm" style={{ left: "-7cqw", top: "27cqw" }}>
            <span className="cb-chip-icon">
              <IconBank className="size-4" />
            </span>
            Con la app de cualquier banco
          </div>
          <div className="cb-chip cb-chip-barrier" style={{ left: "-3cqw", bottom: "-2.5cqw" }}>
            <svg viewBox="0 0 72 40" className="h-8 w-14" aria-hidden>
              <rect x="4" y="22" width="10" height="18" rx="2" fill="#5a5a63" />
              <circle cx="9" cy="27" r="2.4" className="cb-barrier-light" />
              <g className="cb-barrier-arm">
                <rect x="6" y="27" width="64" height="5" rx="2.5" fill="#fff" />
                <rect x="24" y="27" width="8" height="5" fill="#d12f35" />
                <rect x="44" y="27" width="8" height="5" fill="#d12f35" />
              </g>
            </svg>
            <span>
              Pluma <span className="cb-barrier-label-closed text-white/55">cerrada</span>
              <span className="cb-barrier-label-open text-[var(--cb-go-bright)]">abierta</span>
            </span>
          </div>

          <div className="cb-phone" aria-hidden>
            <PhoneMock qrSvg={qrSvg} />
          </div>
        </div>

        <ol className="cb-steps" aria-label="Cómo paga tu cliente">
          <li className="cb-step" data-step="scan">
            <span className="cb-step-n">01</span>Escanea
          </li>
          <li className="cb-step" data-step="confirm">
            <span className="cb-step-n">02</span>Confirma
          </li>
          <li className="cb-step" data-step="done">
            <span className="cb-step-n">03</span>Sale
          </li>
        </ol>
      </div>
    </section>
  );
}
