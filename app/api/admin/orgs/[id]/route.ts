import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer } from "@/lib/auth/dal";
import { deleteOrg } from "@/lib/data/admin";
import { badRequest, errorResponse } from "@/lib/http";

const Body = z.object({ confirmName: z.string().min(1, "Escribe el nombre para confirmar.").max(200) });

/** Permanently delete an organization and what it owns (test or abandoned accounts). */
export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/orgs/[id]">) {
  const { viewer, error } = await apiViewer("admin");
  if (error) return error;
  const { id } = await params;
  if (!/^org_[a-z0-9]{4,40}$/.test(id)) return badRequest("Organización inválida.");
  if (viewer.org?.id === id) return badRequest("Primero vuelve a admin; estás operando como esta organización.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    await deleteOrg(id, parsed.data.confirmName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "admin/orgs/delete");
  }
}
