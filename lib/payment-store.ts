/**
 * In-memory payment status bridge for local/dev.
 * Webhooks and polling both write here so the kiosk UI can converge quickly.
 * For multi-instance production, replace with Redis / durable store.
 */

export type StoredPayment = {
  qrId: string;
  status: "PENDING" | "PAID";
  transactionId?: string;
  amount?: number;
  datePaid?: number;
  updatedAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __codiDoohPayments?: Map<string, StoredPayment>;
};

function store(): Map<string, StoredPayment> {
  if (!globalStore.__codiDoohPayments) {
    globalStore.__codiDoohPayments = new Map();
  }
  return globalStore.__codiDoohPayments;
}

export function markPending(qrId: string): void {
  store().set(qrId, {
    qrId,
    status: "PENDING",
    updatedAt: Date.now(),
  });
}

export function markPaid(
  qrId: string,
  details: { transactionId?: string; amount?: number; datePaid?: number },
): void {
  store().set(qrId, {
    qrId,
    status: "PAID",
    transactionId: details.transactionId,
    amount: details.amount,
    datePaid: details.datePaid,
    updatedAt: Date.now(),
  });
}

export function getPayment(qrId: string): StoredPayment | undefined {
  return store().get(qrId);
}
