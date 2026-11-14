/**
 * Physical actuator bridge (bathroom lock / simple barrier).
 *
 * V1: records pulses in-memory and optionally forwards to a local bridge
 * (Raspberry Pi GPIO agent or ESP32) via RELAY_BRIDGE_URL.
 *
 * Production path: payment confirmed → POST /api/relay/pulse → bridge closes
 * NO/COM for N milliseconds → door/turnstile opens. Cash hardware stays parallel.
 */

export type RelayPulseResult = {
  ok: true;
  mode: "simulated" | "bridge";
  durationMs: number;
  reason: string;
  at: number;
  bridgeStatus?: number;
};

export type RelayEvent = {
  at: number;
  durationMs: number;
  reason: string;
  mode: "simulated" | "bridge";
};

const globalRelay = globalThis as typeof globalThis & {
  __codiDoohRelayLog?: RelayEvent[];
};

function log(): RelayEvent[] {
  if (!globalRelay.__codiDoohRelayLog) {
    globalRelay.__codiDoohRelayLog = [];
  }
  return globalRelay.__codiDoohRelayLog;
}

export function getRecentRelayEvents(limit = 20): RelayEvent[] {
  return log().slice(-limit).reverse();
}

export async function pulseRelay(options?: {
  durationMs?: number;
  reason?: string;
}): Promise<RelayPulseResult> {
  const durationMs = Math.min(
    Math.max(options?.durationMs ?? 3000, 100),
    10_000,
  );
  const reason = options?.reason ?? "payment_confirmed";
  const bridgeUrl = process.env.RELAY_BRIDGE_URL?.replace(/\/$/, "");

  if (bridgeUrl) {
    const res = await fetch(`${bridgeUrl}/pulse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMs, reason }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Relay bridge error (${res.status})`);
    }

    const event: RelayEvent = {
      at: Date.now(),
      durationMs,
      reason,
      mode: "bridge",
    };
    log().push(event);

    return {
      ok: true,
      mode: "bridge",
      durationMs,
      reason,
      at: event.at,
      bridgeStatus: res.status,
    };
  }

  // Desk / cloud MVP without hardware attached yet.
  const event: RelayEvent = {
    at: Date.now(),
    durationMs,
    reason,
    mode: "simulated",
  };
  log().push(event);
  console.info(
    `[relay] SIMULATED pulse ${durationMs}ms — ${reason} (set RELAY_BRIDGE_URL to hit real hardware)`,
  );

  return {
    ok: true,
    mode: "simulated",
    durationMs,
    reason,
    at: event.at,
  };
}
