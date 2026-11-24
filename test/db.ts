import { createPgliteDb, setDbForTests, type Db } from "@/lib/db";

/** Fresh in-memory Postgres (PGlite) with all migrations applied. */
export async function useTestDb(): Promise<Db> {
  const db = await createPgliteDb();
  setDbForTests(db);
  return db;
}
