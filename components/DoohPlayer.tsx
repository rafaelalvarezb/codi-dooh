"use client";

import { useEffect, useState } from "react";
import type { UseCaseConfig } from "@/lib/types";

interface DoohPlayerProps {
  useCase: UseCaseConfig;
}

export function DoohPlayer({ useCase }: DoohPlayerProps) {
  const campaigns = useCase.doohCampaigns;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [useCase.id]);

  useEffect(() => {
    if (campaigns.length <= 1) return;

    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % campaigns.length);
        setVisible(true);
      }, 420);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [campaigns.length, useCase.id]);

  const campaign = campaigns[index] ?? campaigns[0];

  return (
    <section className="relative h-full min-h-0 overflow-hidden border-r border-zinc-800 bg-zinc-950">
      <div
        className={[
          "absolute inset-0 transition-all duration-500 ease-out",
          visible ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
        ].join(" ")}
        style={{ background: campaign.gradient }}
      />

      {/* Atmospheric layers */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(0,0,0,0.45),transparent_50%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div
        className="pointer-events-none absolute bottom-10 right-16 h-56 w-56 rounded-full blur-3xl"
        style={{ background: useCase.accentSoft }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-10">
        <div className="flex items-start justify-between gap-4">
          <div
            className={[
              "max-w-xl transition-all duration-500",
              visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            ].join(" ")}
          >
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
              {campaign.brand}
            </p>
            <h1 className="max-w-[14ch] text-4xl font-semibold leading-[1.05] tracking-tight text-white lg:text-6xl">
              {campaign.headline}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-300 lg:text-lg">
              {campaign.subline}
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-zinc-100 backdrop-blur">
              {campaign.cta}
              <span aria-hidden>→</span>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-zinc-700/70 bg-zinc-950/55 px-4 py-3 shadow-[0_0_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Ad Slot Activo
            </p>
            <p className="mt-1 text-[12px] text-zinc-200">DOOH Programmatic</p>
            <div className="mt-3 space-y-1 font-mono text-[11px] text-zinc-400">
              <p>CPM: $185 MXN</p>
              <p>RevShare Operador: 20%</p>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex gap-1.5">
            {campaigns.map((item, i) => (
              <span
                key={item.id}
                className={[
                  "h-1 rounded-full transition-all duration-500",
                  i === index ? "w-8 bg-white" : "w-2 bg-white/25",
                ].join(" ")}
              />
            ))}
          </div>

          <div className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 backdrop-blur">
            Slot {index + 1}/{campaigns.length} · {useCase.label}
          </div>
        </div>
      </div>
    </section>
  );
}
