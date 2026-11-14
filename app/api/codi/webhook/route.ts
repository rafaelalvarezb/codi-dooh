import { NextResponse } from "next/server";
import { markPaid } from "@/lib/payment-store";

/**
 * Pey webhook receiver for `codi.qr.payment_received`.
 * @see https://docs.pey.mx/docs/webhooks/codi/qr
 *
 * Signature verification (Standard Webhooks) should be enabled in production
 * once PEY_WEBHOOK_SECRET is configured in the Pey portal.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string;
      codiQrId?: string;
      transactionId?: string;
      amount?: number;
      datePaid?: number;
    };

    if (body.type !== "codi.qr.payment_received" || !body.codiQrId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    markPaid(body.codiQrId, {
      transactionId: body.transactionId,
      amount: body.amount,
      datePaid: body.datePaid,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook]", error);
    return NextResponse.json(
      { error: { message: "Invalid webhook payload" } },
      { status: 400 },
    );
  }
}
