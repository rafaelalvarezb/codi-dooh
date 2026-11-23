import { beforeEach, describe, expect, it } from "vitest";
import { useTestDb } from "@/test/db";
import { POST } from "@/app/api/leads/route";
import { LeadSchema, normalizePhone } from "@/lib/leads-schema";
import { NotFoundError } from "./context";
import { countNewLeads, createLead, listLeads, setLeadStatus } from "./leads";

beforeEach(async () => {
  await useTestDb();
});

const valid = {
  name: "Ana López",
  business: "Estacionamiento Roma",
  phone: "+52 55 1234 5678",
  email: "Ana@Ejemplo.MX",
  city: "CDMX",
  spaces: "120",
  message: "",
};

function post(body: unknown, ip = "1.2.3.4") {
  return POST(
    new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("lead form validation", () => {
  it("normalizes Mexican phones", () => {
    expect(normalizePhone("55 1234 5678")).toBe("5512345678");
    expect(normalizePhone("+52 (55) 1234-5678")).toBe("5512345678");
    expect(normalizePhone("1234")).toBeNull();
  });

  it("cleans the input and rejects bad data with a Spanish message", () => {
    const ok = LeadSchema.parse(valid);
    expect(ok).toMatchObject({ phone: "5512345678", email: "ana@ejemplo.mx", spaces: 120, message: undefined });
    const bad = LeadSchema.safeParse({ ...valid, phone: "123" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe("Escribe un teléfono de 10 dígitos.");
    expect(LeadSchema.safeParse({ ...valid, spaces: "0" }).success).toBe(false);
  });
});

describe("leads store", () => {
  it("stores, lists newest first, counts new ones and marks them contacted", async () => {
    const first = await createLead(LeadSchema.parse(valid));
    await new Promise((r) => setTimeout(r, 5));
    const second = await createLead(LeadSchema.parse({ ...valid, business: "Plaza Norte" }));
    const rows = await listLeads();
    expect(rows.map((r) => r.id)).toEqual([second, first]);
    expect(await countNewLeads()).toBe(2);
    await setLeadStatus(first, "contacted");
    expect(await countNewLeads()).toBe(1);
    await expect(setLeadStatus("lead_nope", "contacted")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("POST /api/leads", () => {
  it("saves a valid request", async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
    expect(await listLeads()).toHaveLength(1);
  });

  it("rejects invalid or oversized bodies", async () => {
    expect((await post({ ...valid, name: "" })).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect((await post({ ...valid, message: "x".repeat(5000) })).status).toBe(400);
    expect(await listLeads()).toHaveLength(0);
  });

  it("silently drops bots that fill the hidden field", async () => {
    const res = await post({ ...valid, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(await listLeads()).toHaveLength(0);
  });

  it("allows 5 requests per hour per IP", async () => {
    for (let i = 0; i < 5; i++) expect((await post(valid, "9.9.9.9")).status).toBe(201);
    expect((await post(valid, "9.9.9.9")).status).toBe(429);
    expect((await post(valid, "8.8.8.8")).status).toBe(201);
  });
});
