import { NextResponse } from "next/server";
import { resetPassword, ResetTokenError } from "@/lib/auth/password-reset";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { ResetSchema } from "@/lib/auth/schemas";
import { badRequest } from "@/lib/http";

/** Sets the new password from a reset link. Older sessions stop working. */
export async function POST(request: Request) {
  const parsed = ResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);

  const limit = await rateLimit(`reset:ip:${clientIp(request.headers)}`, 10, 15 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ResetTokenError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[auth/reset]", err);
    return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 500 });
  }
}
