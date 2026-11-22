import { beforeEach, describe, expect, it } from "vitest";
import { useTestDb } from "@/test/db";
import { hashPassword, verifyPassword } from "./password";
import { signSession, verifySession } from "./session-token";
import {
  AccountError,
  authenticate,
  canSwitchToOrg,
  loadViewer,
  registerAccount,
  sessionClaimsFor,
} from "./accounts";
import { canUseArea, homePathFor, safeNextPath } from "./roles";
import { rateLimit } from "./rate-limit";

const KEY = Buffer.from("k".repeat(32));
const OTHER_KEY = Buffer.from("x".repeat(32));

describe("password (scrypt)", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("una-contraseña-larga");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("una-contraseña-larga", hash)).toBe(true);
    expect(await verifyPassword("otra-contraseña", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same-password-123")).not.toBe(await hashPassword("same-password-123"));
  });
});

describe("session token", () => {
  const claims = { uid: "usr_1", oid: "org_1", role: "owner" as const, adm: false };

  it("round-trips", () => {
    expect(verifySession(signSession(claims, KEY), KEY)).toMatchObject(claims);
  });

  it("rejects tampering, wrong key and expiry", () => {
    const token = signSession(claims, KEY);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), adm: true }),
    ).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, KEY)).toBeNull();
    expect(verifySession(token, OTHER_KEY)).toBeNull();
    expect(verifySession(token, KEY, Date.now() + 8 * 86_400_000)).toBeNull();
    expect(verifySession(undefined, KEY)).toBeNull();
    expect(verifySession("a.b.c", KEY)).toBeNull();
  });
});

describe("roles", () => {
  const org = (kind: "host" | "advertiser" | "both") => ({ id: "o", name: "o", kind, isDemo: false });
  it("gates areas by org kind and admin flag", () => {
    expect(canUseArea({ isPlatformAdmin: false, org: org("advertiser") }, "advertiser")).toBe(true);
    expect(canUseArea({ isPlatformAdmin: false, org: org("advertiser") }, "host")).toBe(false);
    expect(canUseArea({ isPlatformAdmin: false, org: org("host") }, "advertiser")).toBe(false);
    expect(canUseArea({ isPlatformAdmin: false, org: org("both") }, "advertiser")).toBe(true);
    expect(canUseArea({ isPlatformAdmin: false, org: org("both") }, "admin")).toBe(false);
    expect(canUseArea({ isPlatformAdmin: true, org: null }, "admin")).toBe(true);
    expect(homePathFor({ isPlatformAdmin: true, org: null })).toBe("/admin");
    expect(homePathFor({ isPlatformAdmin: false, org: org("advertiser") })).toBe("/anunciantes");
  });
  it("only accepts same-site next paths", () => {
    expect(safeNextPath("/anunciantes")).toBe("/anunciantes");
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
  });
});

describe("accounts (DB)", () => {
  beforeEach(async () => {
    await useTestDb();
  });

  const register = (email: string, kind: "advertiser" | "host" = "advertiser") =>
    registerAccount({ kind, orgName: `Org ${email}`, name: "Ana", email, password: "contraseña-segura" });

  it("registers, normalizes email and logs in", async () => {
    const created = await register("Ana@Marca.MX ");
    expect(created.user.email).toBe("ana@marca.mx");
    expect(created.memberships[0].org.kind).toBe("advertiser");

    const auth = await authenticate("ana@marca.mx", "contraseña-segura");
    expect(auth?.user.id).toBe(created.user.id);
    expect(await authenticate("ana@marca.mx", "mala-contraseña")).toBeNull();
    expect(await authenticate("nadie@marca.mx", "contraseña-segura")).toBeNull();
  });

  it("refuses duplicate emails", async () => {
    await register("dup@marca.mx");
    await expect(register("DUP@marca.mx")).rejects.toBeInstanceOf(AccountError);
  });

  it("never lets a user act inside another org, even with a forged org id", async () => {
    const a = await register("a@marca.mx");
    const b = await register("b@marca.mx");
    const orgB = b.memberships[0].org.id;

    // Session claims pointing at org B for user A (e.g. a tampered or stale cookie).
    const viewer = await loadViewer({ v: 1, exp: 0, uid: a.user.id, oid: orgB, role: "owner", adm: false });
    expect(viewer?.org?.id).toBe(a.memberships[0].org.id);
    expect(viewer?.org?.id).not.toBe(orgB);
    expect(await canSwitchToOrg(a.user.id, orgB)).toBe(false);
  });

  it("drops sessions of deleted users", async () => {
    const viewer = await loadViewer({ v: 1, exp: 0, uid: "usr_gone", oid: null, role: null, adm: true });
    expect(viewer).toBeNull();
  });

  it("bootstraps the env platform admin, who may operate any org", async () => {
    const brand = await register("piloto@marca.mx");
    const admin = await authenticate("admin@codidooh.mx", "codidooh");
    expect(admin?.user.isPlatformAdmin).toBe(true);
    expect(await authenticate("admin@codidooh.mx", "otra")).toBeNull();

    const orgId = brand.memberships[0].org.id;
    expect(await canSwitchToOrg(admin!.user.id, orgId)).toBe(true);
    const viewer = await loadViewer({ v: 1, exp: 0, ...sessionClaimsFor(admin!), oid: orgId });
    expect(viewer?.org?.id).toBe(orgId);
    expect(viewer?.actingAsAdmin).toBe(true);
  });

  it("does not grant admin through a forged adm claim", async () => {
    const a = await register("c@marca.mx");
    const viewer = await loadViewer({ v: 1, exp: 0, uid: a.user.id, oid: null, role: null, adm: true });
    expect(viewer?.isPlatformAdmin).toBe(false);
    expect(canUseArea(viewer!, "admin")).toBe(false);
  });
});

describe("rate limit (DB)", () => {
  beforeEach(async () => {
    await useTestDb();
  });

  it("blocks after the limit and resets after the window", async () => {
    const t0 = new Date("2026-11-21T12:00:00Z");
    for (let i = 0; i < 3; i++) expect((await rateLimit("k", 3, 60_000, t0)).ok).toBe(true);
    const blocked = await rateLimit("k", 3, 60_000, new Date(t0.getTime() + 10_000));
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(50);
    expect((await rateLimit("k", 3, 60_000, new Date(t0.getTime() + 61_000))).ok).toBe(true);
    expect((await rateLimit("other", 3, 60_000, t0)).ok).toBe(true);
  });
});
