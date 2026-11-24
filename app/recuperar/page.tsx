import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ForgotForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = { title: "Recuperar contraseña · cobten", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthFrame
      title="Recupera tu contraseña"
      subtitle="Escribe el correo de tu cuenta y te mandamos un enlace para elegir una nueva."
      footer={
        <>
          ¿Ya la recordaste?{" "}
          <Link href="/entrar" className="font-medium text-[var(--cd-ink)] underline underline-offset-4">
            Entra
          </Link>
        </>
      }
    >
      <ForgotForm />
    </AuthFrame>
  );
}
