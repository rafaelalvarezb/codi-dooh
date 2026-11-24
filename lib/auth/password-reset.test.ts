import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTestDb } from "@/test/db";
import { POST as forgot } from "@/app/api/auth/forgot/route";
import { POST as reset } from "@/app/api/auth/reset/route";
import { POST as postLead } from "@/app/api/leads/route";
import { getDb } from "@/lib/db";
import { passwordResets } from "@/lib/db/schema";
import { outbox } from "@/lib/email";
import { authenticate, loadViewer, registerAccount, sessionClaimsFor } from "./accounts";
import { createPasswordReset, hashResetToken, resetPassword, ResetTokenError, RESET_TTL_MS } from "./password-reset";
import { SESSION_MAX_AGE_SEC } from "./session-token";

beforeEach(async () => {
  await useTestDb();
  outbox.length = 0;
});
afterEach(() => {
  delete process.env.LEADS_NOTIFY_EMAIL;
});

const ana = { kind: "advertiser" as const, orgName: "Marca Ana", name: "Ana López", email: "ana@ejemplo.mx", password: "claveoriginal1" };

function req(url: string, body: unknown, ip = "1.1.1.1") {
  return new Request(`http://app.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("password reset tokens", () => {
  it("works once, changes the password and expires other links", async () => {
    await registerAccount(ana);
    const first = await createPasswordReset("ANA@ejemplo.mx");
    const second = await createPasswordReset(ana.email);
    expect(first?.user.email).toBe(ana.email);

    await resetPassword(first!.token, "clavenueva123");
    expect(await authenticate(ana.email, "claveoriginal1")).toBeNull();
    expect(await authenticate(ana.email, "clavenueva123")).not.toBeNull();

    await expect(resetPassword(first!.token, "otra-clave-123")).rejects.toBeInstanceOf(ResetTokenError);
    await expect(resetPassword(second!.token, "otra-clave-123")).rejects.toBeInstanceOf(ResetTokenError);
  });

  it("stores only a hash and rejects expired links", async () => {
    await registerAccount(ana);
    const t0 = new Date("2026-11-23T12:00:00Z");
    const r = await createPasswordReset(ana.email, t0);
    const db = await getDb();
    const rows = await db.select().from(passwordResets);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashResetToken(r!.token));
    expect(rows[0].tokenHash).not.toContain(r!.token);
    await expect(resetPassword(r!.token, "clavenueva123", new Date(t0.getTime() + RESET_TTL_MS + 1))).rejects.toBeInstanceOf(
      ResetTokenError,
    );
  });

  it("gives nothing for unknown emails or the env admin", async () => {
    expect(await createPasswordReset("nadie@ejemplo.mx")).toBeNull();
    expect(await createPasswordReset(process.env.PORTAL_ADMIN_EMAIL || "admin@codidooh.mx")).toBeNull();
  });

  it("signs out sessions issued before the reset", async () => {
    const auth = await registerAccount(ana);
    const claims = sessionClaimsFor(auth);
    const before = { v: 1 as const, ...claims, exp: Math.floor(Date.now() / 1000) - 60 + SESSION_MAX_AGE_SEC };
    expect(await loadViewer(before)).not.toBeNull();
    const r = await createPasswordReset(ana.email);
    await resetPassword(r!.token, "clavenueva123");
    expect(await loadViewer(before)).toBeNull();
    const after = { ...before, exp: Math.floor(Date.now() / 1000) + 5 + SESSION_MAX_AGE_SEC };
    expect(await loadViewer(after)).not.toBeNull();
  });
});

describe("forgot / reset routes", () => {
  it("answers the same for any email and only emails real accounts", async () => {
    await registerAccount(ana);
    const a = await forgot(req("/api/auth/forgot", { email: ana.email }));
    const b = await forgot(req("/api/auth/forgot", { email: "nadie@ejemplo.mx" }));
    expect(a.status).toBe(200);
    expect(await a.json()).toEqual(await b.json());
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(ana.email);
    const link = outbox[0].text.match(/https?:\/\/\S+\/restablecer\?token=\S+/)?.[0];
    expect(link).toBeTruthy();

    const token = decodeURIComponent(new URL(link!).searchParams.get("token")!);
    expect((await reset(req("/api/auth/reset", { token, password: "corta" }))).status).toBe(400);
    expect((await reset(req("/api/auth/reset", { token, password: "clavenueva123" }))).status).toBe(200);
    const again = await reset(req("/api/auth/reset", { token, password: "clavenueva123" }));
    expect(again.status).toBe(400);
    expect((await again.json()).error).toMatch(/Pide uno nuevo/);
  });

  it("limits requests per email without revealing it", async () => {
    await registerAccount(ana);
    for (let i = 0; i < 4; i++) {
      expect((await forgot(req("/api/auth/forgot", { email: ana.email }, `9.9.9.${i}`))).status).toBe(200);
    }
    expect(outbox).toHaveLength(3);
  });
});

describe("demo request notification", () => {
  it("emails the team with the lead and a WhatsApp link", async () => {
    process.env.LEADS_NOTIFY_EMAIL = "equipo@ejemplo.mx";
    const res = await postLead(
      req("/api/leads", { name: "Luis", business: "Plaza Norte", phone: "55 1234 5678", city: "CDMX", spaces: "300" }),
    );
    expect(res.status).toBe(201);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ to: "equipo@ejemplo.mx", subject: "Nueva demo: Plaza Norte" });
    expect(outbox[0].text).toContain("https://wa.me/525512345678");
    expect(outbox[0].html).toContain("Plaza Norte");
  });
});
