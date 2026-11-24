/** Discreet marker for seeded demo data (pitch). */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Datos de ejemplo"
      className={`inline-flex h-5 items-center rounded-[var(--cd-radius-pill)] border border-[var(--cd-line)] px-2 font-mono text-[10px] tracking-[0.08em] text-[var(--cd-muted)] uppercase ${className}`}
    >
      Demo
    </span>
  );
}
