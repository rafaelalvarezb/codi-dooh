import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer } from "@/lib/auth/dal";
import { setLeadStatus } from "@/lib/data/leads";
import { badRequest, errorResponse } from "@/lib/http";

const Body = z.object({ status: z.enum(["new", "contacted"]) });

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/leads/[id]">) {
  const { error } = await apiViewer("admin");
  if (error) return error;
  const { id } = await params;
  if (!/^lead_[a-z0-9]{4,40}$/.test(id)) return badRequest("Contacto inválido.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    await setLeadStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "admin/leads");
  }
}
