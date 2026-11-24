import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/dal";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { createSandbox } from "@/lib/demo-sandbox";

/** "Probar como anunciante": creates a private sandbox and signs the visitor into it. */
export async function POST(request: Request) {
  const limit = await rateLimit(`demo:${clientIp(request.headers)}`, 10, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Ya creaste varias cuentas de prueba. Intenta de nuevo en un rato." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  try {
    const sandbox = await createSandbox();
    await setSessionCookie({ uid: sandbox.userId, oid: sandbox.orgId, role: "owner", adm: false });
    return NextResponse.json({ ok: true, next: `/anunciantes/campanas/${sandbox.campaignId}` }, { status: 201 });
  } catch (err) {
    console.error("[demo/start]", err);
    const message =
      err instanceof Error && err.message === "NO_DEMO_SCREENS"
        ? "La demo no está lista todavía. Pide al equipo que cargue los datos de demo."
        : "No pudimos preparar la cuenta de prueba. Intenta de nuevo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
