"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ViewerOrg } from "@/lib/auth/roles";

export type NavItem = { href: string; label: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "shrink-0 rounded-[var(--cd-radius-pill)] px-3 py-1.5 text-[var(--cd-small)] font-medium transition-colors",
              active
                ? "bg-[var(--cd-ink)] text-white"
                : "text-[var(--cd-ink-2)] hover:bg-[var(--cd-surface)]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

async function switchOrg(orgId: string | null): Promise<string | null> {
  const res = await fetch("/api/auth/switch-org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { next?: string };
  return data.next ?? "/";
}

export function AccountMenu({
  name,
  email,
  orgName,
  orgs,
  activeOrgId,
}: {
  name: string;
  email: string;
  orgName: string;
  orgs: ViewerOrg[];
  activeOrgId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/entrar");
    router.refresh();
  }

  async function pick(orgId: string) {
    setOpen(false);
    const next = await switchOrg(orgId);
    if (next) {
      router.replace(next);
      router.refresh();
    }
  }

  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-[var(--cd-radius-pill)] border border-[var(--cd-line)] bg-[var(--cd-bg)] pr-3 pl-1"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cd-ink)] text-[11px] font-medium text-white">
          {initials || "·"}
        </span>
        <span className="hidden max-w-[140px] truncate text-[var(--cd-small)] font-medium sm:block">
          {orgName}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[var(--cd-radius-md)] border border-[var(--cd-line)] bg-[var(--cd-bg)] shadow-[0_12px_40px_rgba(10,10,11,0.12)]"
        >
          <div className="border-b border-[var(--cd-line)] px-4 py-3">
            <p className="truncate text-[var(--cd-small)] font-medium">{name}</p>
            <p className="truncate text-[var(--cd-label)] text-[var(--cd-muted)]">{email}</p>
          </div>
          {orgs.length > 1 ? (
            <div className="border-b border-[var(--cd-line)] py-1">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  role="menuitem"
                  type="button"
                  onClick={() => void pick(org.id)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-[var(--cd-small)] hover:bg-[var(--cd-surface)]"
                >
                  <span className="truncate">{org.name}</span>
                  {org.id === activeOrgId ? <span className="text-[var(--cd-muted)]">Actual</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          <button
            role="menuitem"
            type="button"
            onClick={() => void logout()}
            className="w-full px-4 py-3 text-left text-[var(--cd-small)] font-medium hover:bg-[var(--cd-surface)]"
          >
            Salir
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ActingAsBanner({ orgName }: { orgName: string }) {
  const router = useRouter();
  async function back() {
    const next = await switchOrg(null);
    router.replace(next ?? "/admin");
    router.refresh();
  }
  return (
    <div className="bg-[var(--cd-night)] text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 text-[var(--cd-small)] sm:px-6">
        <span className="truncate">
          Operas como <strong className="font-medium">{orgName}</strong>
        </span>
        <button type="button" onClick={() => void back()} className="shrink-0 underline underline-offset-4">
          Volver a admin
        </button>
      </div>
    </div>
  );
}
