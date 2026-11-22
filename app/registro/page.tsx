import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta · CODI·DOOH" };

export default function RegisterPage({ searchParams }: PageProps<"/registro">) {
  return (
    <AuthFrame
      title="Crea tu cuenta"
      subtitle="Anúnciate en pantallas donde la gente mira para pagar, o gana con las tuyas."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/entrar" className="font-medium text-[var(--cd-ink)] underline underline-offset-4">
            Entra
          </Link>
        </>
      }
    >
      <Suspense fallback={<RegisterForm initialKind="advertiser" />}>
        <RegisterFormFromParams searchParams={searchParams} />
      </Suspense>
    </AuthFrame>
  );
}

async function RegisterFormFromParams({ searchParams }: Pick<PageProps<"/registro">, "searchParams">) {
  const tipo = (await searchParams).tipo;
  return <RegisterForm initialKind={tipo === "host" ? "host" : "advertiser"} />;
}
