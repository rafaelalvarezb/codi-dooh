/** Loading state for authenticated pages (also gives each segment a Suspense boundary). */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="h-4 w-24 animate-pulse rounded bg-[var(--cd-line)]" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded-[var(--cd-radius-sm)] bg-[var(--cd-line)]" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--cd-radius-md)] bg-[var(--cd-bg)]" />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-[var(--cd-radius-md)] bg-[var(--cd-bg)]" />
    </div>
  );
}
