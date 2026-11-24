import Link from "next/link";
import { CobtenLogo } from "@/components/brand/CobtenLogo";
import type { ReactNode } from "react";

/** Centered card used by /entrar and /registro. */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-4 py-10 sm:px-6">
      <Link
        href="/sitio"
        prefetch={false}
        aria-label="cobten"
        className="self-start text-[22px]"
      >
        <CobtenLogo />
      </Link>
      <h1 className="mt-3 text-[length:var(--cd-title)] leading-tight font-medium tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-[length:var(--cd-body)] text-[var(--cd-ink-2)]">{subtitle}</p>
      <div className="mt-8">{children}</div>
      <div className="mt-8 border-t border-[var(--cd-line)] pt-5 text-[length:var(--cd-small)] text-[var(--cd-muted)]">
        {footer}
      </div>
    </main>
  );
}
