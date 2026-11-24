import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { touchMachine } from "@/lib/machines";
import { markPending } from "@/lib/payment-store";
import { createCodiQr, PeyApiError } from "@/lib/pey";
import {
  HACKATHON_AMOUNT_MXN,
  buildConcept,
  buildNumRef,
  getUseCase,
} from "@/lib/use-cases";
import type { CreateQrResponse, UseCaseId } from "@/lib/types";

const DEMO_QR_PAYLOAD =
  "00020126580014mx.banxico.codi01000210MX0321234567890123456789012345203MXN5204599953037605802MX5916COMERCIO DE PRUEB6009CIUDAD MX63044B3A";

async function createMockQr() {
  const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const dataUrl = await QRCode.toDataURL(DEMO_QR_PAYLOAD, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 236,
    color: { dark: "#0A0A0B", light: "#ffffff" },
  });
  // Strip data-url prefix — UI adds it (Pey returns raw base64).
  const qrImage = dataUrl.replace(/^data:image\/png;base64,/, "");
  return {
    id: mockId,
    qrString: DEMO_QR_PAYLOAD,
    qrImage,
  };
}

const BodySchema = z.object({
  useCaseId: z.enum(["parking", "laundry", "restroom"]).optional(),
  machineId: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,64}$/i)
    .optional(),
});

function shouldUseMock(): boolean {
  const apiKey = process.env.PEY_API_KEY;
  return !apiKey || apiKey === "sk_live_your_key_here";
}

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Solicitud inválida", type: "INVALID_REQUEST" } },
        { status: 400 },
      );
    }
    const body: { useCaseId?: UseCaseId; machineId?: string } = parsed.data;

    const useCase = getUseCase(body.useCaseId ?? "parking");
    const concept = buildConcept(useCase);
    const numRef = buildNumRef();
    const machineId = body.machineId || useCase.id;

    const peyQr = shouldUseMock()
      ? await createMockQr()
      : await createCodiQr({
          amount: HACKATHON_AMOUNT_MXN,
          concept,
          expiration: 600,
          numRef,
          // Faster: UI draws the QR from qrString (QrFallback).
          generateImage: false,
          metadata: {
            product: "codi-dooh",
            useCase: useCase.id,
            ticket: useCase.ticketLabel,
            machineId,
          },
        });

    // The ledger must never block charging: log and keep going.
    try {
      await markPending(peyQr.id, {
        machineId,
        concept,
        amount: HACKATHON_AMOUNT_MXN,
      });
      await touchMachine(machineId, "online");
    } catch (ledgerError) {
      console.error("[create-qr] ledger write failed", ledgerError);
    }

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
