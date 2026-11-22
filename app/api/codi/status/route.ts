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
  const rawQrId = searchParams.get("qrId")?.trim() ?? "";
  const qrId = /^[A-Za-z0-9_.:-]{1,128}$/.test(rawQrId) ? rawQrId : "";

  if (!qrId) {
    return NextResponse.json(
      { error: { message: "qrId es requerido", type: "INVALID_REQUEST" } },
      { status: 400 },
    );
  }

  try {
    const cached = await getPayment(qrId).catch((ledgerError) => {
      console.error("[status] ledger read failed", ledgerError);
      return undefined;
    });
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
      await markPaid(qrId, {
        transactionId: paid.id,
        amount: paid.amount,
        datePaid: paid.datePaid,
      }).catch((ledgerError) => {
        console.error("[status] ledger write failed", ledgerError);
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

    // Transient network blips to Pey should not break the kiosk wait loop.
    const isNetwork =
      error instanceof TypeError ||
      (error instanceof Error &&
        /fetch failed|timeout|ECONNRESET|ENOTFOUND/i.test(error.message));

    if (isNetwork) {
      console.warn("[status] Pey unreachable briefly; keeping PENDING");
      const payload: PaymentStatusResponse = {
        qrId,
        status: "PENDING",
        paid: false,
      };
      return NextResponse.json(payload);
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
