import { NextResponse } from "next/server";
import { setPortalSession, verifyCredentials } from "@/lib/portal-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña requeridos" },
        { status: 400 },
      );
    }
    if (!verifyCredentials(email, password)) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 },
      );
    }
    await setPortalSession(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[portal/login]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
