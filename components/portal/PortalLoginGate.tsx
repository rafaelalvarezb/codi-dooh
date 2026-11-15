import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

export async function PortalLoginGate() {
  const session = await getPortalSession();
  if (session) redirect("/portal");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[13px] font-medium tracking-[0.06em] text-[var(--cd-muted)] uppercase">
        CODI-DOOH
      </p>
      <h1 className="mt-2 text-[32px] font-medium tracking-[-0.03em]">
        Portal de operación
      </h1>
      <p className="mt-2 text-[15px] text-[var(--cd-ink-2)]">
        Máquinas, cobros CoDi y resumen del día. Sin comisión en CoDi; ads en
        fases siguientes.
      </p>
      <div className="mt-8">
        <PortalLoginForm />
      </div>
    </main>
  );
}
