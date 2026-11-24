"use client";

import { useEffect } from "react";

/**
 * Links to "#como-funciona" would jump past the pinned hero and skip the
 * payment animation. Instead, scroll gently through the hero (so the phone
 * scans, confirms and shows "Pago recibido") and then on to the section.
 * Any wheel, touch or key press hands control back to the user.
 */
const TARGET = "como-funciona";
const NAV_OFFSET = 96;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Leg = { from: number; to: number; ms: number; ease: (t: number) => number; pauseAfter?: number };

export function HowItWorksScroll() {
  useEffect(() => {
    let raf = 0;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      removeListeners();
    };
    const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const addListeners = () => userEvents.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    const removeListeners = () => userEvents.forEach((e) => window.removeEventListener(e, stop));

    const runLegs = (legs: Leg[]) =>
      new Promise<void>((resolve) => {
        let i = 0;
        let start = 0;
        const step = (now: number) => {
          if (cancelled) return resolve();
          const leg = legs[i];
          if (!start) start = now;
          const t = Math.min(1, (now - start) / leg.ms);
          window.scrollTo(0, leg.from + (leg.to - leg.from) * leg.ease(t));
          if (t < 1) {
            raf = requestAnimationFrame(step);
            return;
          }
          const next = () => {
            i += 1;
            start = 0;
            if (i >= legs.length || cancelled) resolve();
            else raf = requestAnimationFrame(step);
          };
          if (leg.pauseAfter) setTimeout(next, leg.pauseAfter);
          else next();
        };
        raf = requestAnimationFrame(step);
      });

    const onClick = async (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.(`a[href="#${TARGET}"]`);
      const target = document.getElementById(TARGET);
      const hero = document.querySelector<HTMLElement>(".cb-hero");
      if (!link || !target) return;
      event.preventDefault();
      history.replaceState(null, "", `#${TARGET}`);

      const targetY = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!hero || reduce || hero.dataset.static !== undefined) {
        window.scrollTo(0, targetY);
        return;
      }

      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const heroEnd = heroTop + hero.offsetHeight - window.innerHeight;
      const legs: Leg[] = [];
      let y = window.scrollY;
      if (y > heroTop + 40) {
        // Already past the start of the scene: go back up first, quickly.
        legs.push({ from: y, to: heroTop, ms: 700, ease: easeInOutCubic, pauseAfter: 150 });
        y = heroTop;
      }
      // Through the scene at a readable pace, a short beat on "Pago recibido"…
      legs.push({ from: y, to: heroEnd, ms: 3800, ease: easeInOutSine, pauseAfter: 400 });
      // …then on to the section.
      legs.push({ from: heroEnd, to: targetY, ms: 900, ease: easeInOutCubic });

      cancelled = false;
      cancelAnimationFrame(raf);
      // Let this click finish before listening for the user taking over.
      setTimeout(addListeners, 0);
      await runLegs(legs);
      removeListeners();
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stop();
    };
  }, []);
  return null;
}
