import { NextResponse } from "next/server";
import { canSwitchToOrg, loadViewer } from "@/lib/auth/accounts";
import { apiViewer, setSessionCookie } from "@/lib/auth/dal";
import { homePathFor } from "@/lib/auth/roles";
import { SwitchOrgSchema } from "@/lib/auth/schemas";

/** Switch the active org (own memberships; platform admins may operate any org). */
export async function POST(request: Request) {
  const { viewer, error } = await apiViewer();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const clear = body && typeof body === "object" && "orgId" in body && body.orgId === null;
  if (clear && viewer.isPlatformAdmin) {
    await setSessionCookie({ uid: viewer.userId, oid: null, role: null, adm: true });
    return NextResponse.json({ ok: true, next: "/admin" });
  }

  const parsed = SwitchOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Organización inválida." }, { status: 400 });
  }
  if (!(await canSwitchToOrg(viewer.userId, parsed.data.orgId))) {
    return NextResponse.json({ error: "No tienes acceso a esa organización." }, { status: 403 });
  }

  const claims = {
    uid: viewer.userId,
    oid: parsed.data.orgId,
    role: "owner" as const,
    adm: viewer.isPlatformAdmin,
  };
  const next = await loadViewer({ v: 1, exp: 0, ...claims });
  if (!next?.org) {
    return NextResponse.json({ error: "No tienes acceso a esa organización." }, { status: 403 });
  }
  await setSessionCookie({ ...claims, role: next.role });
  return NextResponse.json({ ok: true, next: homePathFor(next) });
}
