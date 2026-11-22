/**
 * Data Access Layer for auth: the only place that reads the session cookie.
 * Every page, route handler and server action goes through here.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, NextResponse } from "next/server";
import { loadViewer } from "./accounts";
import type { OrgCtx } from "@/lib/data/context";
import { canUseArea, homePathFor, type Area, type Viewer } from "./roles";
import { deriveKey } from "./secret";
import {
  SESSION_MAX_AGE_SEC,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session-token";

export const SESSION_COOKIE = "codidooh_session";

export async function setSessionCookie(claims: Omit<SessionPayload, "v" | "exp">) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(claims, deriveKey("session-v1")), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Verified viewer for this request, or null. Memoized per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Session checks compare expiry against the clock: always request-time.
  await connection();
  const jar = await cookies();
  const payload = verifySession(jar.get(SESSION_COOKIE)?.value, deriveKey("session-v1"));
  if (!payload) return null;
  return loadViewer(payload);
});

/** For pages: redirects to login, or to the viewer's home if the area is off-limits. */
export async function requireViewer(area?: Area, nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(nextPath ? `/entrar?next=${encodeURIComponent(nextPath)}` : "/entrar");
  }
  if (area && !canUseArea(viewer, area)) redirect(homePathFor(viewer));
  return viewer;
}

/** Same rule as the area, with the viewer's org guaranteed (non-admin areas). */
export async function requireOrgViewer(
  area: Exclude<Area, "admin">,
  nextPath?: string,
): Promise<Viewer & { org: NonNullable<Viewer["org"]> }> {
  const viewer = await requireViewer(area, nextPath);
  if (!viewer.org) redirect(homePathFor(viewer));
  return viewer as Viewer & { org: NonNullable<Viewer["org"]> };
}

/** For route handlers: returns the viewer or a 401/403 JSON response. */
export async function apiViewer(
  area?: Area,
): Promise<{ viewer: Viewer; error?: never } | { viewer?: never; error: NextResponse }> {
  const viewer = await getViewer();
  if (!viewer) {
    return { error: NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }) };
  }
  if (area && !canUseArea(viewer, area)) {
    return { error: NextResponse.json({ error: "No tienes acceso a esta sección." }, { status: 403 }) };
  }
  return { viewer };
}

/** The only way to build an OrgCtx: from a verified viewer's active org. */
export function orgCtx(viewer: Viewer & { org: NonNullable<Viewer["org"]> }): OrgCtx {
  return { orgId: viewer.org.id, kind: viewer.org.kind };
}

/** For route handlers that act on the caller's active org within an area. */
export async function apiOrgCtx(
  area: Exclude<Area, "admin">,
): Promise<{ ctx: OrgCtx; error?: never } | { ctx?: never; error: NextResponse }> {
  const { viewer, error } = await apiViewer(area);
  if (error) return { error };
  if (!viewer.org) return { error: NextResponse.json({ error: "Elige una organización." }, { status: 403 }) };
  return { ctx: orgCtx({ ...viewer, org: viewer.org }) };
}
