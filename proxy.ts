import { NextResponse, type NextRequest } from "next/server";
import { APP_PATH, APP_URL, MARKETING_URL, hostKind } from "@/lib/site";

const PROTECTED = /^\/(anunciantes|host|admin)(\/|$)/;
const SITE_META_FILE = /^\/sitio\/(opengraph-image|twitter-image|icon|apple-icon)/;

/**
 * 1. Domains (lib/site.ts): cobten.com serves the landing (/sitio) and sends
 *    product paths to app.cobten.com; app.cobten.com sends a bare "/" to
 *    /entrar (kiosks always carry ?profile=…) and /sitio to cobten.com.
 * 2. Optimistic auth only: no session cookie → /entrar before rendering.
 *    Real verification (signature, membership, role) is in lib/auth/dal.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const kind = hostKind(request.headers.get("host"));

  if (kind === "marketing") {
    if (APP_PATH.test(pathname)) return NextResponse.redirect(`${APP_URL}${pathname}${search}`);
    if (pathname === "/sitio" || pathname.startsWith("/sitio/")) {
      // Metadata files (og image, icon) are linked under /sitio; pages get clean URLs.
      if (SITE_META_FILE.test(pathname)) return NextResponse.next();
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice("/sitio".length) || "/";
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/sitio" : `/sitio${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (kind === "app") {
    if (pathname === "/" && !search) {
      const url = request.nextUrl.clone();
      url.pathname = "/entrar";
      return NextResponse.redirect(url);
    }
    if (pathname === "/sitio" || pathname.startsWith("/sitio/")) {
      return NextResponse.redirect(`${MARKETING_URL}${pathname.slice("/sitio".length) || "/"}`);
    }
  }

  if (PROTECTED.test(pathname) && !request.cookies.has("codidooh_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and files with an extension
  // (public/ assets, icons, og images keep working on every domain).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
