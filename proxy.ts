import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: no session cookie → send to /entrar before rendering.
 * Real verification (signature, membership, role) happens in lib/auth/dal.ts.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("codidooh_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/entrar";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/anunciantes/:path*", "/host/:path*", "/admin/:path*"],
};
