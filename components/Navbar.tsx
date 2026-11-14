"use client";

import { UseCaseSelector } from "@/components/UseCaseSelector";
import type { UseCaseId } from "@/lib/types";

interface NavbarProps {
  useCaseId: UseCaseId;
  onUseCaseChange: (id: UseCaseId) => void;
  locked?: boolean;
}

export function Navbar({ useCaseId, onUseCaseChange, locked }: NavbarProps) {
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-950/90 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-[0.18em] text-zinc-50">
            CODI
          </span>
          <span className="text-[15px] font-light tracking-[0.22em] text-zinc-500">
            •
          </span>
          <span className="text-[15px] font-semibold tracking-[0.18em] text-zinc-50">
            DOOH
          </span>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          </span>
          <span className="font-mono text-[11px] tracking-wide text-zinc-400">
            En línea · SPEI &lt;1s
          </span>
        </div>
      </div>

      <UseCaseSelector
        value={useCaseId}
        onChange={onUseCaseChange}
        disabled={locked}
      />
    </header>
  );
}
