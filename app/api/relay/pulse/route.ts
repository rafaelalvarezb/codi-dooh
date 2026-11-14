import { NextResponse } from "next/server";
import { pulseRelay } from "@/lib/relay";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      durationMs?: number;
      reason?: string;
    };

    const result = await pulseRelay({
      durationMs: body.durationMs,
      reason: body.reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[relay/pulse]", error);
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo activar el relé.",
          type: "RELAY_ERROR",
        },
      },
      { status: 502 },
    );
  }
}
