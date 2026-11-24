/**
 * Physical actuator bridge (bathroom lock / simple barrier).
 *
 * Poll mode: ESP32 GET /api/relay/events → consumes pending pulse.
 * Push mode: RELAY_BRIDGE_URL/pulse on payment.
 *
 * IMPORTANT: In-memory pending does NOT work across Vercel serverless
 * instances. For ESP32 hardware demos, run `npm run dev` on the same
 * LAN and point POLL_URL at that Mac IP, OR set Upstash Redis env vars.
 */

export type RelayPulseResult = {
  ok: true;
  mode: "simulated" | "bridge" | "redis";
  durationMs: number;
  reason: string;
  at: number;
  bridgeStatus?: number;
  hint?: string;
};

export type RelayEvent = {
  at: number;
  durationMs: number;
  reason: string;
  mode: "simulated" | "bridge" | "redis";
};

export type PendingPulse = {
  durationMs: number;
  reason: string;
  at: number;
} | null;

const PENDING_KEY = "codidooh:relay:pending";

const globalRelay = globalThis as typeof globalThis & {
  __codiDoohRelayLog?: RelayEvent[];
  __codiDoohRelayPending?: PendingPulse;
};

function log(): RelayEvent[] {
  if (!globalRelay.__codiDoohRelayLog) {
    globalRelay.__codiDoohRelayLog = [];
  }
  return globalRelay.__codiDoohRelayLog;
}

function hasUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash error (${res.status})`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

export function getRecentRelayEvents(limit = 20): RelayEvent[] {
  return log().slice(-limit).reverse();
}

async function enqueuePending(durationMs: number, reason: string) {
  const pending: NonNullable<PendingPulse> = {
    durationMs,
    reason,
    at: Date.now(),
  };
  if (hasUpstash()) {
    await redisCommand(["SET", PENDING_KEY, JSON.stringify(pending), "EX", 60]);
    return;
  }
  globalRelay.__codiDoohRelayPending = pending;
}

/** ESP32 poll: return and clear one pending pulse. */
export async function consumePendingPulse(): Promise<PendingPulse> {
  if (hasUpstash()) {
    const raw = await redisCommand(["GETDEL", PENDING_KEY]);
    if (typeof raw !== "string" || !raw) return null;
    try {
      return JSON.parse(raw) as NonNullable<PendingPulse>;
    } catch {
      return null;
    }
  }
  const pending = globalRelay.__codiDoohRelayPending ?? null;
  globalRelay.__codiDoohRelayPending = null;
  return pending;
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

  await enqueuePending(durationMs, reason);

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

  const mode = hasUpstash() ? "redis" : "simulated";
  const event: RelayEvent = {
    at: Date.now(),
    durationMs,
    reason,
    mode,
  };
  log().push(event);
  console.info(
    `[relay] ${mode} pulse ${durationMs}ms — ${reason}`,
  );

  return {
    ok: true,
    mode,
    durationMs,
    reason,
    at: event.at,
    hint:
      mode === "simulated"
        ? "Pending pulse is in-memory on this Vercel instance only. For ESP32 on LAN, run npm run dev on your Mac and point POLL_URL at that IP, or set Upstash Redis env vars."
        : undefined,
  };
}
