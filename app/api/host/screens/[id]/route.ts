import { NextResponse } from "next/server";
import { apiOrgCtx } from "@/lib/auth/dal";
import { updateScreen } from "@/lib/data/host";
import { SCREEN_ID, ScreenPatchSchema } from "@/lib/data/host-schemas";
import { badRequest, errorResponse } from "@/lib/http";

export async function PATCH(request: Request, { params }: RouteContext<"/api/host/screens/[id]">) {
  const { ctx, error } = await apiOrgCtx("host");
  if (error) return error;
  const { id } = await params;
  if (!SCREEN_ID.test(id)) return badRequest("Pantalla inválida.");
  const parsed = ScreenPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    await updateScreen(ctx, id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "host/screens/patch");
  }
}
