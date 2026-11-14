import { NextResponse } from "next/server";
import { markPending } from "@/lib/payment-store";
import { createCodiQr, PeyApiError } from "@/lib/pey";
import {
  HACKATHON_AMOUNT_MXN,
  buildConcept,
  buildNumRef,
  getUseCase,
} from "@/lib/use-cases";
import type { CreateQrResponse, UseCaseId } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      useCaseId?: UseCaseId;
    };

    const useCase = getUseCase(body.useCaseId ?? "parking");
    const concept = buildConcept(useCase);
    const numRef = buildNumRef();

    const peyQr = await createCodiQr({
      amount: HACKATHON_AMOUNT_MXN,
      concept,
      expiration: 600,
      numRef,
      generateImage: true,
      metadata: {
        product: "codi-dooh",
        useCase: useCase.id,
        ticket: useCase.ticketLabel,
      },
    });

    markPending(peyQr.id);

    const payload: CreateQrResponse = {
      qrId: peyQr.id,
      qrString: peyQr.qrString,
      qrImage: peyQr.qrImage,
      amount: HACKATHON_AMOUNT_MXN,
      concept,
      numRef,
      expiration: 600,
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof PeyApiError) {
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

    console.error("[create-qr]", error);
    return NextResponse.json(
      {
        error: {
          message: "No se pudo crear el cobro CoDi. Intenta de nuevo.",
          type: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
