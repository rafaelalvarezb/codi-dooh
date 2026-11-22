import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Entrar · CODI·DOOH" };

export default function LoginPage() {
  return (
    <AuthFrame
      title="Entra a tu cuenta"
      subtitle="Campañas, pantallas e ingresos en un solo lugar."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-[var(--cd-ink)] underline underline-offset-4">
            Crea una
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
