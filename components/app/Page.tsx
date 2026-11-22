import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[length:var(--cd-label)] tracking-[0.08em] text-[var(--cd-muted)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-[28px] leading-tight font-medium tracking-[-0.03em] sm:text-[length:var(--cd-title)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[length:var(--cd-body)] text-[var(--cd-ink-2)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">{title}</h2>
          {description ? (
            <p className="mt-1 text-[length:var(--cd-small)] text-[var(--cd-muted)]">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--cd-radius-md)] border border-[var(--cd-line)] bg-[var(--cd-bg)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-[length:var(--cd-label)] text-[var(--cd-muted)]">{label}</p>
      <p className="mt-1 text-[22px] font-medium tracking-[-0.02em] tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[length:var(--cd-label)] text-[var(--cd-muted)]">{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 px-6 py-10 sm:items-center sm:text-center">
      <p className="text-[length:var(--cd-headline)] font-medium tracking-[-0.02em]">{title}</p>
      <p className="max-w-md text-[length:var(--cd-body)] text-[var(--cd-muted)]">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </Card>
  );
}
