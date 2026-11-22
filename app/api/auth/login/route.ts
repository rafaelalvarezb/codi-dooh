import { NextResponse } from "next/server";
import { authenticate, sessionClaimsFor } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/dal";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { homePathFor, safeNextPath } from "@/lib/auth/roles";
import { LoginSchema } from "@/lib/auth/schemas";
import { z } from "zod";

const BodySchema = LoginSchema.extend({ next: z.string().max(512).optional() });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  const ip = clientIp(request.headers);
  const [byIp, byAccount] = await Promise.all([
    rateLimit(`login-ip:${ip}`, 20, 60_000),
    rateLimit(`login:${ip}:${email}`, 5, 60_000),
  ]);
  if (!byIp.ok || !byAccount.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(byIp.retryAfterSec, byAccount.retryAfterSec)) },
      },
    );
  }

  try {
    const auth = await authenticate(email, password);
    if (!auth) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    const claims = sessionClaimsFor(auth);
    await setSessionCookie(claims);
    const org = auth.memberships[0]?.org ?? null;
    const next =
      safeNextPath(parsed.data.next) ??
      homePathFor({ isPlatformAdmin: auth.user.isPlatformAdmin, org });
    return NextResponse.json({ ok: true, next });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
