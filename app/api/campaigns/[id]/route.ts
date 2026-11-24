import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer, orgCtx } from "@/lib/auth/dal";
import { setCampaignStatus } from "@/lib/data/campaigns";
import { badRequest, errorResponse } from "@/lib/http";

const BodySchema = z.object({ status: z.enum(["active", "paused"]) });

/** Pause or resume one of the caller's own campaigns. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/campaigns/[id]">) {
  const { viewer, error } = await apiViewer();
  if (error) return error;
  if (!viewer.org) return NextResponse.json({ error: "Elige una organización." }, { status: 403 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { id } = await params;
  if (!/^cmp_[a-z0-9]{6,32}$/.test(id)) return badRequest("Campaña inválida.");

  try {
    await setCampaignStatus(orgCtx({ ...viewer, org: viewer.org }), id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "campaigns/patch");
  }
}
