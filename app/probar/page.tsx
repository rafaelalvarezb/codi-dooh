import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { StartDemo } from "@/components/auth/StartDemo";

export const metadata: Metadata = { title: "Probar como anunciante · cobten", robots: { index: false, follow: false } };

export default function TryPage() {
  return (
    <AuthFrame
      title="Prueba cobten como anunciante"
      subtitle="Te damos una marca de prueba con una campaña que ya lleva una semana al aire. Puedes subir tu video, elegir pantallas y publicar en las pantallas demo."
      footer={
        <>
          ¿Quieres una cuenta real?{" "}
          <Link href="/registro" className="font-medium text-[var(--cd-ink)] underline underline-offset-4">
            Crea una
          </Link>
        </>
      }
    >
      <StartDemo />
    </AuthFrame>
  );
}
