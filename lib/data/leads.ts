/**
 * Demo requests from the landing page. Listing and status changes are
 * platform-admin only: call after requireViewer("admin") / apiViewer("admin").
 */
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import type { LeadData } from "@/lib/leads-schema";
import { NotFoundError } from "./context";

export type Lead = typeof leads.$inferSelect;
export type LeadStatus = Lead["status"];

export async function createLead(data: Omit<LeadData, "website">, source = "landing"): Promise<string> {
  const db = await getDb();
  const id = newId("lead");
  await db.insert(leads).values({
    id,
    name: data.name,
    business: data.business,
    phone: data.phone,
    email: data.email ?? null,
    city: data.city ?? null,
    spaces: data.spaces ?? null,
    message: data.message ?? null,
    source,
  });
  return id;
}

export async function listLeads(): Promise<Lead[]> {
  const db = await getDb();
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function countNewLeads(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(leads).where(eq(leads.status, "new"));
  return row?.n ?? 0;
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const db = await getDb();
  const rows = await db.update(leads).set({ status }).where(eq(leads.id, id)).returning({ id: leads.id });
  if (rows.length === 0) throw new NotFoundError("No encontramos ese contacto.");
}
