import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer } from "@/lib/auth/dal";
import { setCampaignBilling, setCampaignStatusAsAdmin } from "@/lib/data/admin";
import { badRequest, errorResponse } from "@/lib/http";

const Body = z
  .object({ billing: z.enum(["paid", "pilot"]).optional(), status: z.enum(["active", "paused"]).optional() })
  .refine((b) => b.billing || b.status, "Nada que cambiar.");

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/campaigns/[id]">) {
  const { error } = await apiViewer("admin");
  if (error) return error;
  const { id } = await params;
  if (!/^cmp_[a-z0-9]{4,40}$/.test(id)) return badRequest("Campaña inválida.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    if (parsed.data.billing) await setCampaignBilling(id, parsed.data.billing);
    if (parsed.data.status) await setCampaignStatusAsAdmin(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "admin/campaigns");
  }
}
