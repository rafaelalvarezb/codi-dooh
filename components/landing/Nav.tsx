"use client";

import { useEffect, useState } from "react";
import { CobtenLogo } from "@/components/brand/CobtenLogo";
import { IconClose, IconMenu } from "./icons";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#estacionamientos", label: "Estacionamientos" },
  { href: "#anunciantes", label: "Anunciantes" },
  { href: "#preguntas", label: "Preguntas" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
      <nav
        aria-label="Principal"
        className="cb-nav-pill mx-auto flex h-14 max-w-[1120px] items-center gap-2 rounded-full pr-2 pl-5 text-white"
      >
        <a href="#inicio" className="mr-auto text-[21px]" aria-label="cobten, inicio">
          <CobtenLogo tone="white" />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3.5 py-2 text-[14px] text-white/70 transition hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="/probar"
          className="hidden rounded-full px-3.5 py-2 text-[14px] text-white/70 transition hover:text-white lg:inline-flex lg:ml-2"
        >
          Probar demo
        </a>
        <a
          href="/entrar"
          className="hidden rounded-full px-3.5 py-2 text-[14px] text-white/70 transition hover:text-white sm:inline-flex"
        >
          Entrar
        </a>
        <a
          href="#demo"
          className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-medium text-[var(--cb-ink)] transition hover:bg-white/90"
        >
          Agenda una demo
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="cb-mobile-menu"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10 md:hidden"
        >
          {open ? <IconClose className="size-5" /> : <IconMenu className="size-5" />}
        </button>
      </nav>
      {open ? (
        <div id="cb-mobile-menu" className="cb-nav-pill mx-auto mt-2 max-w-[1120px] rounded-[24px] p-2 text-white md:hidden">
          <ul>
            {[...LINKS, { href: "/probar", label: "Probar como anunciante" }, { href: "/entrar", label: "Entrar" }].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-[16px] px-4 py-3.5 text-[16px] text-white/85 hover:bg-white/10"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
