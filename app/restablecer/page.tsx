import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ResetForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = {
  title: "Nueva contraseña · cobten",
  robots: { index: false },
  // The token in the URL must never leak to other sites.
  referrer: "no-referrer",
};

export default function ResetPage() {
  return (
    <AuthFrame
      title="Elige una nueva contraseña"
      subtitle="Después podrás entrar con ella desde cualquier dispositivo."
      footer={
        <>
          ¿El enlace venció?{" "}
          <Link href="/recuperar" className="font-medium text-[var(--cd-ink)] underline underline-offset-4">
            Pide uno nuevo
          </Link>
        </>
      }
    >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthFrame>
  );
}
