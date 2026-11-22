"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

export type Column = {
  /** Short axis label ("19", "13 h"). */
  tick: string;
  /** Full label for tooltip and table ("19 nov", "13:00 – 13:59"). */
  label: string;
  value: number;
};

/** Rounds the axis to 1/2/5 × 10ⁿ steps so ticks read cleanly. */
export function niceAxis(max: number, count = 3): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return { max: top, ticks };
}

function compact(n: number) {
  return n >= 10_000 ? `${Math.round(n / 1000).toLocaleString("es-MX")} mil` : n.toLocaleString("es-MX");
}

/**
 * Single-series column chart. One color (the accent), no legend: the section
 * title names the series. Hover, touch or arrow keys show the value; the
 * table below carries every value without hovering.
 */
export function ColumnChart({
  data,
  title,
  unit,
  tickEvery = 1,
  height = 168,
}: {
  data: Column[];
  /** Accessible name and table caption, e.g. "Reproducciones por día". */
  title: string;
  /** Unit after the value in the tooltip, singular/plural. */
  unit: [string, string];
  /** Show one axis label every N columns. */
  tickEvery?: number;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  const peak = Math.max(0, ...data.map((d) => d.value));
  const axis = niceAxis(peak);
  const n = data.length;

  function pick(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((cur) => (cur == null ? (d > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, cur + d))));
    } else if (e.key === "Home") {
      setActive(0);
    } else if (e.key === "End") {
      setActive(n - 1);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  }

  const current = active != null ? data[active] : null;
  const tipLeft = active != null ? ((active + 0.5) / n) * 100 : 0;
  const tipShift = tipLeft < 15 ? "0%" : tipLeft > 85 ? "-100%" : "-50%";

  return (
    <figure className="m-0">
      <div className="flex gap-2" style={{ height }}>
        {/* Y axis */}
        <div className="relative w-9 shrink-0 text-right text-[11px] text-[var(--cd-subtle)] tabular-nums" aria-hidden>
          {axis.ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / axis.max) * 100}%` }}>
              {compact(t)}
            </span>
          ))}
        </div>
        {/* Plot */}
        <div
          role="img"
          aria-label={`${title}. Usa las flechas para recorrer los valores.`}
          aria-describedby={tableId}
          tabIndex={0}
          className="relative min-w-0 flex-1 touch-pan-y rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)] focus-visible:ring-offset-4"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActive(null);
          }}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {axis.ticks.map((t) => (
            <div
              key={t}
              aria-hidden
              className="absolute inset-x-0 h-px bg-[var(--cd-line)]"
              style={{ top: `${100 - (t / axis.max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" aria-hidden>
            {data.map((d, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[24px] rounded-t-[4px] transition-[opacity,height] duration-200"
                  style={{
                    height: `${(d.value / axis.max) * 100}%`,
                    background: "var(--cd-accent)",
                    opacity: active == null || active === i ? 1 : 0.35,
                  }}
                />
              </div>
            ))}
          </div>
          {current ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -top-2 z-10 rounded-[var(--cd-radius-sm)] border border-[var(--cd-line)] bg-[var(--cd-bg)] px-3 py-2 whitespace-nowrap shadow-[0_6px_24px_rgba(10,10,11,0.08)]"
              style={{ left: `${tipLeft}%`, transform: `translate(${tipShift}, -100%)` }}
            >
              <p className="text-[length:var(--cd-body)] font-medium tabular-nums">
                {current.value.toLocaleString("es-MX")} {current.value === 1 ? unit[0] : unit[1]}
              </p>
              <p className="text-[length:var(--cd-label)] text-[var(--cd-muted)]">{current.label}</p>
            </div>
          ) : null}
        </div>
      </div>
      {/* X axis */}
      <div className="mt-1.5 flex gap-2" aria-hidden>
        <div className="w-9 shrink-0" />
        <div className="flex min-w-0 flex-1 gap-[2px] text-[11px] text-[var(--cd-subtle)]">
          {data.map((d, i) => (
            <span key={i} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
              {i % tickEvery === 0 ? d.tick : ""}
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {current ? `${current.label}: ${current.value} ${current.value === 1 ? unit[0] : unit[1]}` : ""}
      </p>
      <details className="mt-3 text-[length:var(--cd-small)]">
        <summary className="cursor-pointer text-[var(--cd-muted)] select-none hover:text-[var(--cd-ink)]">Ver tabla</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-[var(--cd-radius-sm)] border border-[var(--cd-line)]">
          <table id={tableId} className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <tbody className="divide-y divide-[var(--cd-line)]">
              {data.map((d, i) => (
                <tr key={i}>
                  <th scope="row" className="px-3 py-1.5 font-normal text-[var(--cd-ink-2)]">
                    {d.label}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.value.toLocaleString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
