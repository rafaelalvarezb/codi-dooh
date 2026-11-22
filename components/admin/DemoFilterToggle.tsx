"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

const COOKIE = "codidooh_hide_demo";

/** "Ocultar demo": a cookie so the server filters totals and lists. */
export function DemoFilterToggle({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checked, setChecked] = useOptimistic(hidden);
  function toggle() {
    const next = !checked;
    document.cookie = `${COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    start(() => {
      setChecked(next);
      router.refresh();
    });
  }
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--cd-radius-sm)] border border-[var(--cd-line)] bg-[var(--cd-bg)] px-3 text-[length:var(--cd-small)] font-medium">
      <input type="checkbox" role="switch" checked={checked} onChange={toggle} className="h-4 w-4 accent-[var(--cd-ink)]" />
      Ocultar demo
      {pending ? <span className="sr-only">Actualizando</span> : null}
    </label>
  );
}
