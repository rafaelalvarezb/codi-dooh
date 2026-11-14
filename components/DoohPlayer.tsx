"use client";

import { useEffect, useState } from "react";
import { getUseCase } from "@/lib/use-cases";
import type { UseCaseId } from "@/lib/types";

interface DoohPlayerProps {
  useCaseId: UseCaseId;
  dimmed?: boolean;
}

export function DoohPlayer({ useCaseId, dimmed = false }: DoohPlayerProps) {
  const useCase = getUseCase(useCaseId);
  const campaigns = useCase.doohCampaigns;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [useCaseId]);

  useEffect(() => {
    if (campaigns.length <= 1) return;
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % campaigns.length);
        setVisible(true);
      }, 380);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [campaigns.length, useCaseId]);

  const campaign = campaigns[index] ?? campaigns[0];

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-[#0B0F14]">
      <div
        className={[
          "absolute inset-0 transition-all duration-500 ease-out",
          visible ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
        ].join(" ")}
        style={{ background: campaign.gradient }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(255,255,255,0.12),transparent_42%)]" />
      <div
        className={[
          "absolute inset-0 bg-black/35 transition-opacity duration-500",
          dimmed ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-10">
        <div
          className={[
            "max-w-xl transition-all duration-500",
            visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          ].join(" ")}
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
            {campaign.brand}
          </p>
          <h1 className="max-w-[14ch] text-4xl font-semibold leading-[1.05] tracking-tight text-white lg:text-6xl">
            {campaign.headline}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/80 lg:text-lg">
            {campaign.subline}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex gap-1.5">
            {campaigns.map((item, i) => (
              <span
                key={item.id}
                className={[
                  "h-1 rounded-full transition-all duration-500",
                  i === index ? "w-8 bg-white" : "w-2 bg-white/30",
                ].join(" ")}
              />
            ))}
          </div>
          <p className="rounded-full border border-white/15 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 backdrop-blur">
            DOOH · Slot {index + 1}/{campaigns.length}
          </p>
        </div>
      </div>
    </section>
  );
}
