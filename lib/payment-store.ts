/**
 * CoDi payment ledger, backed by the `payments` table.
 * Webhooks and polling write here so the kiosk UI converges quickly, and the
 * portal / analytics read the same rows. `createdAt` (QR shown) → `paidAt`
 * is the checkout window used for verified attention.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/db/schema";

export type StoredPayment = {
  qrId: string;
  status: "PENDING" | "PAID";
  transactionId?: string;
  /** MXN (e.g. 0.01). Stored as centavos. */
  amount?: number;
  datePaid?: number;
  createdAt?: number;
  updatedAt: number;
  machineId?: string;
  concept?: string;
  isDemo?: boolean;
};

const toCents = (mxn?: number) =>
  mxn === undefined || !Number.isFinite(mxn) ? undefined : Math.round(mxn * 100);

/**
 * Pey's `datePaid` units aren't documented; accept seconds or ms and fall back
 * to now when the value is missing or implausible (>1 day off).
 */
export function normalizePaidAt(datePaid: number | undefined, now = Date.now()): Date {
  if (datePaid === undefined || !Number.isFinite(datePaid)) return new Date(now);
  const ms = datePaid < 1e12 ? datePaid * 1000 : datePaid;
  return Math.abs(ms - now) > 24 * 60 * 60 * 1000 ? new Date(now) : new Date(ms);
}

type Row = typeof payments.$inferSelect;

function toStored(row: Row): StoredPayment {
  return {
    qrId: row.qrId,
    status: row.status,
    transactionId: row.transactionId ?? undefined,
    amount: row.amountCents === null ? undefined : row.amountCents / 100,
    datePaid: row.paidAt?.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    machineId: row.machineId ?? undefined,
    concept: row.concept ?? undefined,
    isDemo: row.isDemo,
  };
}

export async function markPending(
  qrId: string,
  meta?: { machineId?: string; concept?: string; amount?: number },
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(payments)
    .values({
      qrId,
      status: "PENDING",
      machineId: meta?.machineId,
      concept: meta?.concept,
      amountCents: toCents(meta?.amount),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function markPaid(
  qrId: string,
  details: {
    transactionId?: string;
    amount?: number;
    datePaid?: number;
    machineId?: string;
    concept?: string;
  },
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const paidAt = normalizePaidAt(details.datePaid);
  const amountCents = toCents(details.amount);
  await db
    .insert(payments)
    .values({
      qrId,
      status: "PAID",
      transactionId: details.transactionId,
      amountCents,
      machineId: details.machineId,
      concept: details.concept,
      paidAt,
      // Unknown QR (e.g. webhook before create): window collapses to paidAt.
      createdAt: paidAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: payments.qrId,
      set: {
        status: "PAID",
        transactionId: sql`coalesce(${details.transactionId ?? null}, ${payments.transactionId})`,
        amountCents: sql`coalesce(${amountCents ?? null}::integer, ${payments.amountCents})`,
        machineId: sql`coalesce(${payments.machineId}, ${details.machineId ?? null})`,
        concept: sql`coalesce(${payments.concept}, ${details.concept ?? null})`,
        // Keep the first confirmed paid time (webhook and polling both land here).
        paidAt: sql`coalesce(${payments.paidAt}, ${paidAt.toISOString()}::timestamptz)`,
        updatedAt: now,
      },
    });
}

export async function getPayment(
  qrId: string,
): Promise<StoredPayment | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(payments).where(eq(payments.qrId, qrId));
  return row ? toStored(row) : undefined;
}

export async function listPayments(
  limit = 50,
  options?: { machineIds?: string[]; includeDemo?: boolean },
): Promise<StoredPayment[]> {
  const db = await getDb();
  const filters = [];
  if (options?.includeDemo === false) filters.push(eq(payments.isDemo, false));
  if (options?.machineIds) {
    if (options.machineIds.length === 0) return [];
    filters.push(inArray(payments.machineId, options.machineIds));
  }
  const rows = await db
    .select()
    .from(payments)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(payments.updatedAt))
    .limit(limit);
  return rows.map(toStored);
}

export async function paymentStats(options?: {
  machineIds?: string[];
  includeDemo?: boolean;
}) {
  const db = await getDb();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const filters = [eq(payments.status, "PAID")];
  if (options?.includeDemo === false) filters.push(eq(payments.isDemo, false));
  if (options?.machineIds) {
    if (options.machineIds.length === 0) {
      return emptyStats();
    }
    filters.push(inArray(payments.machineId, options.machineIds));
  }
  const paidAt = sql`coalesce(${payments.paidAt}, ${payments.updatedAt})`;
  const [row] = await db
    .select({
      todayCount: sql<number>`count(*) filter (where ${paidAt} >= ${dayAgo.toISOString()}::timestamptz)`.mapWith(Number),
      todayCents: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${paidAt} >= ${dayAgo.toISOString()}::timestamptz), 0)`.mapWith(Number),
      weekCount: sql<number>`count(*) filter (where ${paidAt} >= ${weekAgo.toISOString()}::timestamptz)`.mapWith(Number),
      weekCents: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${paidAt} >= ${weekAgo.toISOString()}::timestamptz), 0)`.mapWith(Number),
      totalCount: sql<number>`count(*)`.mapWith(Number),
      totalCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`.mapWith(Number),
    })
    .from(payments)
    .where(and(...filters));
  return {
    todayCount: row?.todayCount ?? 0,
    todayAmount: (row?.todayCents ?? 0) / 100,
    weekCount: row?.weekCount ?? 0,
    weekAmount: (row?.weekCents ?? 0) / 100,
    totalCount: row?.totalCount ?? 0,
    totalAmount: (row?.totalCents ?? 0) / 100,
  };
}

function emptyStats() {
  return {
    todayCount: 0,
    todayAmount: 0,
    weekCount: 0,
    weekAmount: 0,
    totalCount: 0,
    totalAmount: 0,
  };
}
