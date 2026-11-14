import { NextResponse } from "next/server";
import { getPayment, markPaid } from "@/lib/payment-store";
import {
  findPaidTransaction,
  getCodiQrTransactions,
  PeyApiError,
} from "@/lib/pey";
import type { PaymentStatusResponse } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qrId = searchParams.get("qrId")?.trim();

  if (!qrId) {
    return NextResponse.json(
      { error: { message: "qrId es requerido", type: "INVALID_REQUEST" } },
      { status: 400 },
    );
  }

  try {
    const cached = getPayment(qrId);
    if (cached?.status === "PAID") {
      const payload: PaymentStatusResponse = {
        qrId,
        status: "PAID",
        paid: true,
        transactionId: cached.transactionId,
        amount: cached.amount,
        datePaid: cached.datePaid,
      };
      return NextResponse.json(payload);
    }

    const txs = await getCodiQrTransactions(qrId);
    const paid = findPaidTransaction(txs);

    if (paid) {
      markPaid(qrId, {
        transactionId: paid.id,
        amount: paid.amount,
        datePaid: paid.datePaid,
      });

      const payload: PaymentStatusResponse = {
        qrId,
        status: "PAID",
        paid: true,
        transactionId: paid.id,
        amount: paid.amount,
        datePaid: paid.datePaid,
      };
      return NextResponse.json(payload);
    }

    const payload: PaymentStatusResponse = {
      qrId,
      status: "PENDING",
      paid: false,
    };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof PeyApiError) {
      // Fresh QR with no txs yet can 404 — treat as pending.
      if (error.status === 404) {
        const payload: PaymentStatusResponse = {
          qrId,
          status: "PENDING",
          paid: false,
        };
        return NextResponse.json(payload);
      }

      return NextResponse.json(
        {
          error: {
            message: error.message,
            type: error.type ?? "PEY_ERROR",
            requestId: error.requestId,
          },
        },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }

    console.error("[status]", error);
    return NextResponse.json(
      {
        error: {
          message: "No se pudo consultar el estado del pago.",
          type: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
