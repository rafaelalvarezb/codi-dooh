import { NextResponse } from "next/server";
import { apiOrgCtx } from "@/lib/auth/dal";
import { saveClabe, updateBusiness } from "@/lib/data/host";
import { OrgPatchSchema } from "@/lib/data/host-schemas";
import { badRequest, errorResponse } from "@/lib/http";

/** Update the host's business details or payout CLABE. */
export async function PATCH(request: Request) {
  const { ctx, error } = await apiOrgCtx("host");
  if (error) return error;
  const parsed = OrgPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    if ("business" in parsed.data) {
      await updateBusiness(ctx, parsed.data.business);
      return NextResponse.json({ ok: true });
    }
    const res = await saveClabe(ctx, parsed.data.clabe);
    return NextResponse.json({ ok: true, bankName: res.bankName });
  } catch (err) {
    return errorResponse(err, "host/org");
  }
}
