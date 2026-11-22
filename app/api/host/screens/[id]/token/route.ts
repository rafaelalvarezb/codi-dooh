import { NextResponse } from "next/server";
import { apiOrgCtx } from "@/lib/auth/dal";
import { rotateScreenToken } from "@/lib/data/host";
import { SCREEN_ID } from "@/lib/data/host-schemas";
import { badRequest, errorResponse } from "@/lib/http";

/** Rotate the kiosk secret: the old link stops reporting plays immediately. */
export async function POST(_request: Request, { params }: RouteContext<"/api/host/screens/[id]/token">) {
  const { ctx, error } = await apiOrgCtx("host");
  if (error) return error;
  const { id } = await params;
  if (!SCREEN_ID.test(id)) return badRequest("Pantalla inválida.");
  try {
    await rotateScreenToken(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "host/screens/token");
  }
}
