/**
 * Operator machines registry.
 * Seeded profiles match kiosk ?profile= ids.
 * Swap for Postgres when DATABASE_URL is configured.
 */

export type MachineStatus = "online" | "offline" | "unknown";

export type Machine = {
  id: string;
  name: string;
  location: string;
  profile: "bathroom" | "parking" | "laundry";
  status: MachineStatus;
  kioskPath: string;
  lastSeenAt?: number;
};

const SEED: Machine[] = [
  {
    id: "bathroom",
    name: "Baño · Planta baja",
    location: "Plaza demo · WC público",
    profile: "bathroom",
    status: "online",
    kioskPath: "/?profile=bathroom",
  },
  {
    id: "parking",
    name: "Parking · Caseta A",
    location: "Plaza demo · Estacionamiento",
    profile: "parking",
    status: "online",
    kioskPath: "/?profile=parking&session=1",
  },
  {
    id: "laundry",
    name: "Lavandería · Máquina 03",
    location: "Plaza demo · Lavandería",
    profile: "laundry",
    status: "online",
    kioskPath: "/?profile=laundry&session=1",
  },
];

const globalStore = globalThis as typeof globalThis & {
  __codiDoohMachines?: Map<string, Machine>;
};

function store(): Map<string, Machine> {
  if (!globalStore.__codiDoohMachines) {
    globalStore.__codiDoohMachines = new Map(
      SEED.map((m) => [m.id, { ...m }]),
    );
  }
  return globalStore.__codiDoohMachines;
}

export function listMachines(): Machine[] {
  return Array.from(store().values());
}

export function getMachine(id: string): Machine | undefined {
  return store().get(id);
}

export function touchMachine(id: string, status: MachineStatus = "online") {
  const m = store().get(id);
  if (!m) return;
  store().set(id, { ...m, status, lastSeenAt: Date.now() });
}
