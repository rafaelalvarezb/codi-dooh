/**
 * Account service: registration, login and session → viewer resolution.
 * No Next.js imports, so it runs in route handlers, scripts and tests.
 */
import { timingSafeEqual } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { memberships, organizations, users } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";
import type { OrgKind, Viewer, ViewerOrg } from "./roles";
import type { SessionPayload } from "./session-token";

export class AccountError extends Error {
  constructor(public code: "EMAIL_TAKEN") {
    super(code);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type UserRow = typeof users.$inferSelect;
type MembershipWithOrg = { role: "owner" | "member"; org: ViewerOrg };

export type AuthResult = { user: UserRow; memberships: MembershipWithOrg[] };

export async function registerAccount(input: {
  kind: OrgKind;
  orgName: string;
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const db = await getDb();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing) throw new AccountError("EMAIL_TAKEN");

      const [user] = await tx
        .insert(users)
        .values({ id: newId("usr"), email, passwordHash, name: input.name.trim() })
        .returning();
      const [org] = await tx
        .insert(organizations)
        .values({ id: newId("org"), name: input.orgName.trim(), kind: input.kind })
        .returning();
      await tx.insert(memberships).values({ userId: user.id, orgId: org.id, role: "owner" });
      return {
        user,
        memberships: [{ role: "owner" as const, org: toViewerOrg(org) }],
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AccountError("EMAIL_TAKEN");
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | undefined;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

function toViewerOrg(org: typeof organizations.$inferSelect): ViewerOrg {
  return { id: org.id, name: org.name, kind: org.kind, isDemo: org.isDemo };
}

async function membershipsFor(userId: string): Promise<MembershipWithOrg[]> {
  const db = await getDb();
  const rows = await db
    .select({ role: memberships.role, org: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));
  return rows.map((r) => ({ role: r.role, org: toViewerOrg(r.org) }));
}

function envAdmin() {
  return {
    email: normalizeEmail(process.env.PORTAL_ADMIN_EMAIL || "admin@codidooh.mx"),
    password: process.env.PORTAL_ADMIN_PASSWORD || "codidooh",
  };
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Verifies credentials. The platform admin from PORTAL_ADMIN_* env vars is
 * authoritative: its password always comes from env, and its user row is
 * created or refreshed on login.
 */
export async function authenticate(rawEmail: string, password: string): Promise<AuthResult | null> {
  const db = await getDb();
  const email = normalizeEmail(rawEmail);
  const admin = envAdmin();

  if (email === admin.email) {
    if (!safeEqual(password, admin.password)) {
      await verifyAgainstDummy(password);
      return null;
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ id: newId("usr"), email, passwordHash, name: "Admin CODI·DOOH", isPlatformAdmin: true })
      .onConflictDoUpdate({ target: users.email, set: { passwordHash, isPlatformAdmin: true } })
      .returning();
    return { user, memberships: await membershipsFor(user.id) };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return verifyAgainstDummy(password).then(() => null);
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { user, memberships: await membershipsFor(user.id) };
}

/** Session claims for a freshly authenticated user (first org is active). */
export function sessionClaimsFor(auth: AuthResult): Omit<SessionPayload, "v" | "exp"> {
  const first = auth.memberships[0];
  return {
    uid: auth.user.id,
    oid: first?.org.id ?? null,
    role: first?.role ?? null,
    adm: auth.user.isPlatformAdmin,
  };
}

/**
 * Turns a verified session into a Viewer, re-checking the database: the user
 * must still exist and still belong to the active org (platform admins may
 * operate any org). Claims in the cookie are never trusted on their own.
 */
export async function loadViewer(payload: SessionPayload): Promise<Viewer | null> {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, payload.uid));
  if (!user) return null;

  const orgs = await membershipsFor(user.id);
  let org: ViewerOrg | null = null;
  let role: Viewer["role"] = null;
  let actingAsAdmin = false;

  if (payload.oid) {
    const own = orgs.find((m) => m.org.id === payload.oid);
    if (own) {
      org = own.org;
      role = own.role;
    } else if (user.isPlatformAdmin) {
      const [row] = await db.select().from(organizations).where(eq(organizations.id, payload.oid));
      if (row) {
        org = toViewerOrg(row);
        role = "owner";
        actingAsAdmin = true;
      }
    }
  }
  if (!org && !user.isPlatformAdmin && orgs[0]) {
    org = orgs[0].org;
    role = orgs[0].role;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    org,
    role,
    actingAsAdmin,
    orgs: orgs.map((m) => m.org),
  };
}

/** Can this user switch the session to `orgId`? */
export async function canSwitchToOrg(userId: string, orgId: string): Promise<boolean> {
  const db = await getDb();
  const [user] = await db.select({ adm: users.isPlatformAdmin }).from(users).where(eq(users.id, userId));
  if (!user) return false;
  if (user.adm) {
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId));
    return Boolean(org);
  }
  const [m] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)));
  return Boolean(m);
}
