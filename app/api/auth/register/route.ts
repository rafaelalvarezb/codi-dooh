import { NextResponse } from "next/server";
import { AccountError, registerAccount, sessionClaimsFor } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/dal";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { homePathFor } from "@/lib/auth/roles";
import { RegisterSchema } from "@/lib/auth/schemas";

export async function POST(request: Request) {
  const parsed = RegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
      { status: 400 },
    );
  }

  const limit = await rateLimit(`register:${clientIp(request.headers)}`, 3, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    const auth = await registerAccount(parsed.data);
    await setSessionCookie(sessionClaimsFor(auth));
    const org = auth.memberships[0]?.org ?? null;
    const home = homePathFor({ isPlatformAdmin: false, org });
    const next = org?.kind === "host" ? "/host/bienvenida" : home;
    return NextResponse.json({ ok: true, next }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountError && error.code === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 },
      );
    }
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}
