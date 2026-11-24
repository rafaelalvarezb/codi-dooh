import { NextResponse } from "next/server";
import { consumePendingPulse, getRecentRelayEvents } from "@/lib/relay";

/**
 * ESP32 poll endpoint.
 * Returns pending:true once per queued pulse (consumed), plus recent log.
 */
export async function GET() {
  const pending = await consumePendingPulse();
  return NextResponse.json({
    pending: Boolean(pending),
    durationMs: pending?.durationMs ?? 0,
    reason: pending?.reason ?? null,
    at: pending?.at ?? null,
    events: getRecentRelayEvents(),
  });
}
