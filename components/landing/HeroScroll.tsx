"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { KioskMock } from "./KioskMock";
import { PhoneMock } from "./PhoneMock";
import { IconBank, IconCash, IconTicket } from "./icons";

/**
 * Pinned scroll scene: the screen on the parking pay station settles, a phone
 * rises to its QR, the payment goes through and the ticket is paid. Scroll progress is written to CSS
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
            Paga tu estacionamiento con CoDi
          </p>
          <h1 id="hero-title" className="cb-display mx-auto mt-6 max-w-[14ch] text-[clamp(44px,7.4vw,100px)]">
            Pagas con tu banco. <span className="text-white/45">Sales en segundos.</span>
          </h1>
          <p className="cb-lead mx-auto mt-6 max-w-[38rem] text-white/65">
            ¿No traes efectivo? En la máquina de cobro escanea el QR CoDi con la app de tu banco y listo. Sin
            comisiones.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-medium text-[var(--cb-ink)] transition hover:bg-white/90"
            >
              Ver cómo funciona
            </a>
            <a
              href="#estacionamientos"
              className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[15px] font-medium text-white transition hover:bg-white/10"
            >
              Para negocios
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
            <PayStation />
            <div className="cb-bezel">
              <KioskMock qrSvg={qrSvg} />
            </div>
          </div>

          <div className="cb-chip cb-chip-hide-sm" style={{ left: "-7cqw", top: "9cqw" }}>
            <span className="cb-chip-icon">
              <IconCash className="size-4" />
            </span>
            ¿Sin efectivo? Paga con CoDi
          </div>
          <div className="cb-chip cb-chip-hide-sm" style={{ left: "-9cqw", top: "27cqw" }}>
            <span className="cb-chip-icon">
              <IconBank className="size-4" />
            </span>
            Con la app de tu banco, sin comisiones
          </div>
          <div className="cb-chip cb-chip-ticket" style={{ left: "-6cqw", bottom: "-2.5cqw" }}>
            <span className="cb-chip-icon cb-ticket-icon">
              <IconTicket className="size-4" />
            </span>
            <span>
              Boleto 0427 <span className="cb-ticket-pending text-white/55">· por pagar</span>
              <span className="cb-ticket-paid text-[var(--cb-go-bright)]">· pagado</span>
            </span>
          </div>

          <div className="cb-phone" aria-hidden>
            <PhoneMock qrSvg={qrSvg} />
          </div>
        </div>

        <ol className="cb-steps" aria-label="Cómo pagas">
          <li className="cb-step" data-step="scan">
            <span className="cb-step-n">01</span>Escanea
          </li>
          <li className="cb-step" data-step="confirm">
            <span className="cb-step-n">02</span>Confirma
          </li>
          <li className="cb-step" data-step="done">
            <span className="cb-step-n">03</span>Sal
          </li>
        </ol>
      </div>
    </section>
  );
}

/** The existing pay station the screen is mounted on (generic, no brand). */
function PayStation() {
  return (
    <div className="cb-machine" aria-hidden>
      <p className="absolute top-[1.9cqw] left-0 w-full text-center font-mono text-[0.95cqw] tracking-[0.3em] text-white/40 uppercase">
        Pago de estacionamiento
      </p>
      <div className="absolute inset-x-[8cqw] top-[72cqw] grid grid-cols-[1.3fr_1fr] gap-[3cqw]">
        <div className="space-y-[2.2cqw]">
          <div className="rounded-[1cqw] bg-[#0b0c0d] px-[2cqw] py-[1.4cqw] font-mono text-[1.6cqw] text-[#7fd6a3]/80 shadow-[inset_0_0_0_0.2cqw_rgba(255,255,255,0.06)]">
            Inserte su boleto
          </div>
          <Slot label="Boleto" />
          <Slot label="Billetes" />
        </div>
        <div className="space-y-[2.2cqw]">
          <div className="grid grid-cols-3 gap-[0.8cqw]">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="h-[2.6cqw] rounded-[0.6cqw] bg-white/[0.07] shadow-[inset_0_-0.2cqw_0_rgba(0,0,0,0.4)]" />
            ))}
          </div>
          <Slot label="Monedas" small />
        </div>
      </div>
    </div>
  );
}

function Slot({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-[1.4cqw]">
      <span
        className={`block h-[1.3cqw] rounded-full bg-black shadow-[inset_0_0.3cqw_0.4cqw_rgba(0,0,0,0.9),0_0.15cqw_0_rgba(255,255,255,0.08)] ${
          small ? "w-[5cqw]" : "flex-1"
        }`}
      />
      <span className="font-mono text-[0.9cqw] tracking-[0.12em] text-white/35 uppercase">{label}</span>
    </div>
  );
}
