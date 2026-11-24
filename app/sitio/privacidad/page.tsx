import type { Metadata } from "next";
import { CobtenLogo } from "@/components/brand/CobtenLogo";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  alternates: { canonical: "/privacidad" },
};

/** Plain-language notice for the demo form. Review with a lawyer before launch. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <a href="/sitio" className="text-[22px]" aria-label="cobten, inicio">
        <CobtenLogo />
      </a>
      <h1 className="cb-h2 mt-12">Aviso de privacidad</h1>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-[var(--cb-ink-2)]">
        <p>
          cobten usa los datos que nos das en el formulario “Agenda una demo” (nombre, negocio, teléfono, correo,
          ciudad, número de cajones y mensaje) solo para contactarte y preparar una propuesta para tu negocio.
        </p>
        <p>No vendemos ni compartimos tus datos con terceros para fines de publicidad.</p>
        <p>
          Puedes pedirnos en cualquier momento que corrijamos o borremos tus datos respondiendo al mensaje con el que
          te contactemos.
        </p>
        <p className="text-[14px] text-[var(--cb-muted)]">Última actualización: noviembre de 2026.</p>
      </div>
    </main>
  );
}
