import { NextResponse } from "next/server";
import { z } from "zod";
import { markPaid } from "@/lib/payment-store";
import { pulseRelay } from "@/lib/relay";

/**
 * Pey webhook receiver for `codi.qr.payment_received`.
 * @see https://docs.pey.mx/docs/webhooks/codi/qr
 *
 * Signature verification (Standard Webhooks) should be enabled in production
 * once PEY_WEBHOOK_SECRET is configured in the Pey portal.
 */
const WebhookSchema = z.object({
  type: z.string().optional(),
  codiQrId: z.string().max(128).optional(),
  transactionId: z.string().max(128).optional(),
  amount: z.number().nonnegative().optional(),
  datePaid: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const body = WebhookSchema.parse(await request.json());

    if (body.type !== "codi.qr.payment_received" || !body.codiQrId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    try {
      await markPaid(body.codiQrId, {
        transactionId: body.transactionId,
        amount: body.amount,
        datePaid: body.datePaid,
      });
    } catch (ledgerError) {
      // Status polling also records the payment; don't block the relay.
      console.error("[webhook] ledger write failed", ledgerError);
    }

    // Fire door/turnstile actuator (simulated until RELAY_BRIDGE_URL is set).
    try {
      await pulseRelay({
        durationMs: 3000,
        reason: `webhook:${body.codiQrId}`,
      });
    } catch (relayError) {
      console.error("[webhook] relay pulse failed", relayError);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook]", error);
    return NextResponse.json(
      { error: { message: "Invalid webhook payload" } },
      { status: 400 },
    );
  }
}
