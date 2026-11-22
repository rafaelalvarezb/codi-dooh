/**
 * Database client.
 *
 * - DATABASE_URL set → Neon Postgres (serverless driver, pooled over WebSocket).
 * - No DATABASE_URL → PGlite (Postgres compiled to WASM, in-process). In
 *   `next dev` it persists to `.data/pglite`; elsewhere it lives in memory,
 *   mirroring the old in-memory stores. Same Drizzle code path either way.
 */
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as typeof globalThis & {
  __codiDooh_db?: Promise<Db>;
};

export function getDb(): Promise<Db> {
  if (!g.__codiDooh_db) {
    g.__codiDooh_db = createDb().catch((error) => {
      g.__codiDooh_db = undefined;
      throw error;
    });
  }
  return g.__codiDooh_db;
}

/** Tests inject an isolated PGlite database. */
export function setDbForTests(db: Db | undefined) {
  g.__codiDooh_db = db ? Promise.resolve(db) : undefined;
}

export function usingRealDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const pool = new Pool({ connectionString: url });
    return drizzle({ client: pool, schema }) as unknown as Db;
  }

  const persist = process.env.NODE_ENV === "development";
  return createPgliteDb(
    persist ? path.join(process.cwd(), ".data", "pglite") : undefined,
  );
}

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dataDir, { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}

export { schema };
