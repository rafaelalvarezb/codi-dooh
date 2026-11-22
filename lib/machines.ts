/**
 * Operator machines registry, backed by the `screens` table.
 * Legacy demo kiosks (ids match ?profile=) are ensured on first read so the
 * existing portal and kiosk links keep working.
 */
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { screens } from "@/lib/db/schema";

export type MachineStatus = "online" | "offline" | "unknown";

export type Machine = {
  id: string;
  name: string;
  location: string;
  profile: "bathroom" | "parking" | "laundry";
  status: MachineStatus;
  kioskPath: string;
  lastSeenAt?: number;
  orgId?: string | null;
  isDemo?: boolean;
};

/** A kiosk counts as online if it checked in during the last 5 minutes. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const LEGACY: Array<Pick<Machine, "id" | "name" | "location" | "profile">> = [
  {
    id: "bathroom",
    name: "Baño · Planta baja",
    location: "Plaza demo · WC público",
    profile: "bathroom",
  },
  {
    id: "parking",
    name: "Parking · Caseta A",
    location: "Plaza demo · Estacionamiento",
    profile: "parking",
  },
  {
    id: "laundry",
    name: "Lavandería · Máquina 03",
    location: "Plaza demo · Lavandería",
    profile: "laundry",
  },
];

const LEGACY_PATHS: Record<string, string> = {
  bathroom: "/?profile=bathroom",
  parking: "/?profile=parking&session=1",
  laundry: "/?profile=laundry&session=1",
};

/** Per-database memo so each DB instance (incl. test DBs) is seeded once. */
const legacySeeded = new WeakSet<object>();

async function ensureLegacyMachines() {
  const db = await getDb();
  if (legacySeeded.has(db)) return;
  await db
    .insert(screens)
    .values(LEGACY.map((m) => ({ ...m, acceptsAds: false })))
    .onConflictDoNothing();
  legacySeeded.add(db);
}

export function machineStatus(
  lastSeenAt: Date | null | undefined,
  now = Date.now(),
): MachineStatus {
  if (!lastSeenAt) return "unknown";
  return now - lastSeenAt.getTime() <= ONLINE_WINDOW_MS ? "online" : "offline";
}

type ScreenRow = typeof screens.$inferSelect;

function toMachine(row: ScreenRow): Machine {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    profile: row.profile,
    status: machineStatus(row.lastSeenAt),
    kioskPath:
      LEGACY_PATHS[row.id] ?? `/?profile=${row.profile}&screen=${row.id}`,
    lastSeenAt: row.lastSeenAt?.getTime(),
    orgId: row.orgId,
    isDemo: row.isDemo,
  };
}

export async function listMachines(): Promise<Machine[]> {
  await ensureLegacyMachines();
  const db = await getDb();
  const rows = await db
    .select()
    .from(screens)
    .orderBy(desc(sql`${screens.orgId} is null`), screens.createdAt);
  return rows.map(toMachine);
}

export async function getMachine(id: string): Promise<Machine | undefined> {
  await ensureLegacyMachines();
  const db = await getDb();
  const [row] = await db.select().from(screens).where(eq(screens.id, id));
  return row ? toMachine(row) : undefined;
}

/** Marks a kiosk as seen. Unknown ids are ignored (never auto-created). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the original signature
export async function touchMachine(id: string, _status: MachineStatus = "online") {
  const db = await getDb();
  await db
    .update(screens)
    .set({ lastSeenAt: new Date() })
    .where(eq(screens.id, id));
}
