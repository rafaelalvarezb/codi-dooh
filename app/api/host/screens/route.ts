import { NextResponse } from "next/server";
import { apiOrgCtx } from "@/lib/auth/dal";
import { createScreen } from "@/lib/data/host";
import { ScreenSchema } from "@/lib/data/host-schemas";
import { badRequest, errorResponse } from "@/lib/http";

export async function POST(request: Request) {
  const { ctx, error } = await apiOrgCtx("host");
  if (error) return error;
  const parsed = ScreenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const id = await createScreen(ctx, parsed.data);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "host/screens");
  }
}
