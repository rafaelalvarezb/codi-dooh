/** Small form primitives on the --cd-* tokens. */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[var(--cd-label)] font-medium text-[var(--cd-ink-2)]">{label}</span>
      {children}
      {error ? (
        <span className="text-[var(--cd-small)] text-[var(--cd-danger)]">{error}</span>
      ) : hint ? (
        <span className="text-[var(--cd-small)] text-[var(--cd-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-12 rounded-[var(--cd-radius-sm)] border border-[var(--cd-line)] bg-[var(--cd-bg)] px-4",
        "text-[var(--cd-body)] text-[var(--cd-ink)] outline-none transition-colors",
        "placeholder:text-[var(--cd-subtle)] focus:border-[var(--cd-ink)]",
        "disabled:bg-[var(--cd-surface)] aria-[invalid=true]:border-[var(--cd-danger)]",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
};

export function buttonClass(variant: ButtonProps["variant"] = "primary", size: ButtonProps["size"] = "md") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-[var(--cd-radius-sm)] font-medium transition-opacity",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" ? "h-12 px-5 text-[var(--cd-body)]" : "h-9 px-3 text-[var(--cd-small)]",
    variant === "primary" && "bg-[var(--cd-ink)] text-white hover:opacity-90",
    variant === "secondary" &&
      "border border-[var(--cd-line)] bg-[var(--cd-bg)] text-[var(--cd-ink)] hover:bg-[var(--cd-surface)]",
    variant === "ghost" && "text-[var(--cd-ink-2)] hover:bg-[var(--cd-surface)]",
    variant === "danger" && "border border-[var(--cd-danger-soft)] bg-[var(--cd-danger-soft)] text-[var(--cd-danger)]",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button {...props} className={`${buttonClass(variant, size)} ${className ?? ""}`} />;
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-[var(--cd-radius-sm)] bg-[var(--cd-danger-soft)] px-4 py-3 text-[var(--cd-small)] text-[var(--cd-danger)]"
    >
      {children}
    </p>
  );
}
