import { NextResponse } from "next/server";
import { createPasswordReset } from "@/lib/auth/password-reset";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { ForgotSchema } from "@/lib/auth/schemas";
import { badRequest } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/notifications";
import { APP_URL } from "@/lib/site";

const SAME_ANSWER = { ok: true, message: "Si hay una cuenta con ese correo, te enviamos un enlace para elegir una nueva contraseña." };

/**
 * Starts a password reset. Always gives the same answer, so it can't be used
 * to find out which emails have accounts.
 */
export async function POST(request: Request) {
  const parsed = ForgotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { email } = parsed.data;

  const ip = clientIp(request.headers);
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`forgot:ip:${ip}`, 5, 15 * 60_000),
    rateLimit(`forgot:email:${email}`, 3, 60 * 60_000),
  ]);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSec) } },
    );
  }
  if (!byEmail.ok) return NextResponse.json(SAME_ANSWER);

  try {
    const reset = await createPasswordReset(email);
    if (reset) {
      // Production links always point at the real app domain, never at a
      // Host header someone could forge.
      const origin = process.env.VERCEL_ENV === "production" ? APP_URL : new URL(request.url).origin;
      const link = `${origin}/restablecer?token=${encodeURIComponent(reset.token)}`;
      await sendPasswordResetEmail(reset.user, link);
    }
  } catch (err) {
    console.error("[auth/forgot]", err);
  }
  return NextResponse.json(SAME_ANSWER);
}
