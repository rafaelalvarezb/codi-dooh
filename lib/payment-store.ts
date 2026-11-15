/**
 * In-memory payment status bridge.
 * Webhooks and polling write here so the kiosk UI converges quickly.
 * Also keeps a recent ledger for the operator portal.
 * For multi-instance production, replace with Postgres / Redis.
 */

export type StoredPayment = {
  qrId: string;
  status: "PENDING" | "PAID";
  transactionId?: string;
  amount?: number;
  datePaid?: number;
  updatedAt: number;
  machineId?: string;
  concept?: string;
};

const MAX_LEDGER = 200;

const globalStore = globalThis as typeof globalThis & {
  __codiDoohPayments?: Map<string, StoredPayment>;
  __codiDoohLedger?: StoredPayment[];
};

function store(): Map<string, StoredPayment> {
  if (!globalStore.__codiDoohPayments) {
    globalStore.__codiDoohPayments = new Map();
  }
  return globalStore.__codiDoohPayments;
}

function ledger(): StoredPayment[] {
  if (!globalStore.__codiDoohLedger) {
    globalStore.__codiDoohLedger = [];
  }
  return globalStore.__codiDoohLedger;
}

function pushLedger(entry: StoredPayment) {
  const list = ledger();
  const idx = list.findIndex((p) => p.qrId === entry.qrId);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  if (list.length > MAX_LEDGER) list.length = MAX_LEDGER;
}

export function markPending(
  qrId: string,
  meta?: { machineId?: string; concept?: string; amount?: number },
): void {
  const entry: StoredPayment = {
    qrId,
    status: "PENDING",
    updatedAt: Date.now(),
    machineId: meta?.machineId,
    concept: meta?.concept,
    amount: meta?.amount,
  };
  store().set(qrId, entry);
  pushLedger(entry);
}

export function markPaid(
  qrId: string,
  details: {
    transactionId?: string;
    amount?: number;
    datePaid?: number;
    machineId?: string;
    concept?: string;
  },
): void {
  const prev = store().get(qrId);
  const entry: StoredPayment = {
    qrId,
    status: "PAID",
    transactionId: details.transactionId,
    amount: details.amount ?? prev?.amount,
    datePaid: details.datePaid ?? Date.now(),
    updatedAt: Date.now(),
    machineId: details.machineId ?? prev?.machineId,
    concept: details.concept ?? prev?.concept,
  };
  store().set(qrId, entry);
  pushLedger(entry);
}

export function getPayment(qrId: string): StoredPayment | undefined {
  return store().get(qrId);
}

export function listPayments(limit = 50): StoredPayment[] {
  return ledger().slice(0, limit);
}

export function paymentStats() {
  const paid = ledger().filter((p) => p.status === "PAID");
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const today = paid.filter((p) => (p.datePaid ?? p.updatedAt) >= now - dayMs);
  const week = paid.filter((p) => (p.datePaid ?? p.updatedAt) >= now - weekMs);
  const sum = (rows: StoredPayment[]) =>
    rows.reduce((acc, p) => acc + (p.amount ?? 0), 0);
  return {
    todayCount: today.length,
    todayAmount: sum(today),
    weekCount: week.length,
    weekAmount: sum(week),
    totalCount: paid.length,
    totalAmount: sum(paid),
  };
}
