import Link from "next/link";
import { CobtenLogo } from "@/components/brand/CobtenLogo";
import { buttonClass } from "@/components/ui/form";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <p className="text-[20px]">
        <CobtenLogo />
      </p>
      <h1 className="text-[length:var(--cd-title)] leading-tight font-medium tracking-[-0.03em]">No encontramos esta página</h1>
      <p className="text-[length:var(--cd-body)] text-[var(--cd-muted)]">
        Puede que el link esté incompleto o que ya no tengas acceso a lo que buscas.
      </p>
      <div className="mt-3">
        <Link href="/entrar" className={buttonClass()}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
