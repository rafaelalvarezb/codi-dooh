import type { PeyErrorBody } from "@/lib/types";

const DEFAULT_BASE_URL = "https://api.pey.mx";

export class PeyApiError extends Error {
  readonly status: number;
  readonly type?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    type?: string,
    requestId?: string,
  ) {
    super(message);
    this.name = "PeyApiError";
    this.status = status;
    this.type = type;
    this.requestId = requestId;
  }
}

function getApiKey(): string {
  const key = process.env.PEY_API_KEY;
  if (!key) {
    throw new PeyApiError(
      "PEY_API_KEY no está configurada. Copia .env.example a .env.local.",
      500,
      "MISSING_API_KEY",
    );
  }
  return key;
}

function getBaseUrl(): string {
  return process.env.PEY_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
}

async function peyFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as T & PeyErrorBody;

  if (!response.ok) {
    throw new PeyApiError(
      body.error?.message ?? `Pey API error (${response.status})`,
      response.status,
      body.error?.type,
      body.error?.requestId,
    );
  }

  return body;
}

export interface CreatePeyQrInput {
  amount: number;
  concept: string;
  expiration?: number;
  numRef?: string;
  generateImage?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CreatePeyQrResult {
  id: string;
  qrString: string;
  qrImage: string | null;
}

export interface PeyTransaction {
  id: string;
  status: "PENDING" | "PAID";
  amount: number;
  datePaid?: number;
  description?: string;
}

export interface PeyQrTransactionsResult {
  items: PeyTransaction[];
  nextToken: string | null;
}

/**
 * Creates a CoDi QR via Pey.
 * @see https://docs.pey.mx/docs/api/create-qr
 */
export async function createCodiQr(
  input: CreatePeyQrInput,
): Promise<CreatePeyQrResult> {
  return peyFetch<CreatePeyQrResult>("/codi/qr", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      concept: input.concept,
      expiration: input.expiration ?? 600,
      numRef: input.numRef ?? "0",
      generateImage: input.generateImage ?? true,
      metadata: input.metadata,
    }),
  });
}

/**
 * Lists transactions for a CoDi QR (IDC).
 * @see https://docs.pey.mx/docs/api/get-co-di-qr-transactions
 */
export async function getCodiQrTransactions(
  qrId: string,
): Promise<PeyQrTransactionsResult> {
  return peyFetch<PeyQrTransactionsResult>(
    `/transaction/codi/qr/${encodeURIComponent(qrId)}`,
  );
}

export function findPaidTransaction(
  result: PeyQrTransactionsResult,
): PeyTransaction | undefined {
  return result.items.find((tx) => tx.status === "PAID");
}
