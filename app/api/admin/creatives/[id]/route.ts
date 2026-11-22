import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer } from "@/lib/auth/dal";
import { setCreativeStatus } from "@/lib/data/admin";
import { badRequest, errorResponse } from "@/lib/http";

const Body = z.object({
  status: z.enum(["active", "paused", "rejected"]),
  note: z.string().trim().max(300, "Máximo 300 caracteres.").optional(),
});

/** Admin moderation: the video leaves every kiosk on its next playlist refresh. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/creatives/[id]">) {
  const { error } = await apiViewer("admin");
  if (error) return error;
  const { id } = await params;
  if (!/^crv_[a-z0-9]{4,40}$/.test(id)) return badRequest("Creativo inválido.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    await setCreativeStatus(id, parsed.data.status, parsed.data.note);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "admin/creatives");
  }
}
