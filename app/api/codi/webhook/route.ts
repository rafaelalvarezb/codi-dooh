import { NextResponse } from "next/server";
import { z } from "zod";
import { markPaid } from "@/lib/payment-store";
import { findPaidTransaction, getCodiQrTransactions } from "@/lib/pey";
import { pulseRelay } from "@/lib/relay";
import { verifyWebhook, webhookHeaders } from "@/lib/webhook-signature";

/**
 * Pey webhook receiver for `codi.qr.payment_received`.
 * @see https://docs.pey.mx/docs/webhooks/codi/qr
 *
 * A payment is only trusted when it is authentic:
 * - with PEY_WEBHOOK_SECRET set: the Standard Webhooks signature must match;
 * - without it: Pey's API must confirm the QR is PAID.
 * Unverified calls change nothing (no ledger write, no relay pulse), so a
 * forged request can neither fake "payments during your ad" nor open a door.
 * The kiosk's own status polling still records real payments either way.
 */
const WebhookSchema = z.object({
  type: z.string().optional(),
  codiQrId: z.string().max(128).optional(),
  transactionId: z.string().max(128).optional(),
  amount: z.number().nonnegative().optional(),
  datePaid: z.number().int().positive().optional(),
});

const MAX_BODY_BYTES = 64 * 1024;

type Verified = { transactionId?: string; amount?: number; datePaid?: number };

async function confirmWithPey(qrId: string): Promise<Verified | null> {
  if (!process.env.PEY_API_KEY || process.env.PEY_API_KEY === "sk_live_your_key_here") return null;
  try {
    const paid = findPaidTransaction(await getCodiQrTransactions(qrId));
    return paid ? { transactionId: paid.id, amount: paid.amount, datePaid: paid.datePaid } : null;
  } catch (error) {
    console.error("[webhook] could not confirm with Pey", error);
    return null;
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: { message: "Payload too large" } }, { status: 413 });
  }

  const secret = process.env.PEY_WEBHOOK_SECRET;
  if (secret && !verifyWebhook(secret, webhookHeaders(request.headers), raw)) {
    return NextResponse.json({ error: { message: "Invalid signature" } }, { status: 401 });
  }

  let body: z.infer<typeof WebhookSchema>;
  try {
    body = WebhookSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: { message: "Invalid webhook payload" } }, { status: 400 });
  }

  if (body.type !== "codi.qr.payment_received" || !body.codiQrId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  // Signed → trust the payload. Unsigned → ask Pey and use its data.
  const verified: Verified | null = secret
    ? { transactionId: body.transactionId, amount: body.amount, datePaid: body.datePaid }
    : await confirmWithPey(body.codiQrId);

  if (!verified) {
    console.warn("[webhook] unverified payment notice ignored", body.codiQrId);
    return NextResponse.json({ received: true, verified: false }, { status: 202 });
  }

  try {
    await markPaid(body.codiQrId, verified);
  } catch (ledgerError) {
    // Status polling also records the payment; don't block the relay.
    console.error("[webhook] ledger write failed", ledgerError);
  }

  // Fire door/turnstile actuator (simulated until RELAY_BRIDGE_URL is set).
  try {
    await pulseRelay({ durationMs: 3000, reason: `webhook:${body.codiQrId}` });
  } catch (relayError) {
    console.error("[webhook] relay pulse failed", relayError);
  }

  return NextResponse.json({ received: true });
}
