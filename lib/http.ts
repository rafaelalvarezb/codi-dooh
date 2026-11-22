import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { NotFoundError, ValidationError } from "@/lib/data/context";

export function badRequest(error: ZodError | string) {
  const message = typeof error === "string" ? error : (error.issues[0]?.message ?? "Revisa los datos.");
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Maps domain errors to HTTP; anything unexpected is logged and hidden. */
export function errorResponse(error: unknown, tag: string) {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
  console.error(`[${tag}]`, error);
  return NextResponse.json({ error: "Algo falló. Intenta de nuevo." }, { status: 500 });
}
