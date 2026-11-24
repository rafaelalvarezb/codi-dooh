/** Who can enter which area. Pure, shared by server and tests. */

export type OrgKind = "host" | "advertiser" | "both";
export type Area = "advertiser" | "host" | "admin";

export type ViewerOrg = { id: string; name: string; kind: OrgKind; isDemo: boolean };

export type Viewer = {
  userId: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  /** Active organization; null for a platform admin with no org selected. */
  org: ViewerOrg | null;
  role: "owner" | "member" | null;
  /** True when a platform admin is operating an org they don't belong to. */
  actingAsAdmin: boolean;
  /** Orgs the user belongs to (for the switcher). */
  orgs: ViewerOrg[];
};

export function canAdvertise(kind: OrgKind | undefined): boolean {
  return kind === "advertiser" || kind === "both";
}

export function canHost(kind: OrgKind | undefined): boolean {
  return kind === "host" || kind === "both";
}

export function canUseArea(viewer: Pick<Viewer, "isPlatformAdmin" | "org">, area: Area): boolean {
  if (area === "admin") return viewer.isPlatformAdmin;
  if (area === "advertiser") return canAdvertise(viewer.org?.kind);
  return canHost(viewer.org?.kind);
}

export function homePathFor(viewer: Pick<Viewer, "isPlatformAdmin" | "org">): string {
  if (canHost(viewer.org?.kind)) return "/host";
  if (canAdvertise(viewer.org?.kind)) return "/anunciantes";
  if (viewer.isPlatformAdmin) return "/admin";
  return "/entrar";
}

/** Only allow same-site relative redirects after login. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  return next.slice(0, 512);
}
