import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer, orgCtx } from "@/lib/auth/dal";
import { createCampaign, MAX_SPOTS_PER_SCREEN } from "@/lib/data/campaigns";
import { badRequest, errorResponse } from "@/lib/http";

const BodySchema = z.object({
  name: z.string().trim().min(2, "Ponle nombre a la campaña.").max(80),
  creativeId: z.string().regex(/^crv_[a-z0-9]{6,32}$/),
  screens: z
    .array(
      z.object({
        screenId: z.string().regex(/^[a-z0-9_-]{1,64}$/i),
        spots: z.number().int().min(1).max(MAX_SPOTS_PER_SCREEN),
      }),
    )
    .min(1, "Elige al menos una pantalla.")
    .max(200),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  mode: z.enum(["advertiser", "house"]),
});

/** Create + publish. Goes live immediately (moderation hook runs on upload). */
export async function POST(request: Request) {
  const { viewer, error } = await apiViewer();
  if (error) return error;
  if (!viewer.org) return NextResponse.json({ error: "Elige una organización." }, { status: 403 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const campaign = await createCampaign(orgCtx({ ...viewer, org: viewer.org }), parsed.data);
    return NextResponse.json({ campaign: { id: campaign.id } }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "campaigns");
  }
}
