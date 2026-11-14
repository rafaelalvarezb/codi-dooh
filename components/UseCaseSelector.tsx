"use client";

import { USE_CASE_LIST } from "@/lib/use-cases";
import type { UseCaseId } from "@/lib/types";

interface UseCaseSelectorProps {
  value: UseCaseId;
  onChange: (id: UseCaseId) => void;
  disabled?: boolean;
}

export function UseCaseSelector({
  value,
  onChange,
  disabled = false,
}: UseCaseSelectorProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/80 p-1"
      role="tablist"
      aria-label="Caso de uso"
    >
      {USE_CASE_LIST.map((useCase) => {
        const active = useCase.id === value;
        return (
          <button
            key={useCase.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(useCase.id)}
            className={[
              "relative rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-wide transition-all duration-300",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-zinc-100 text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            ].join(" ")}
          >
            {useCase.label}
          </button>
        );
      })}
    </div>
  );
}
