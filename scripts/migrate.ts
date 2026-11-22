/**
 * Applies versioned migrations in ./drizzle to DATABASE_URL.
 * Runs before `next build` on Vercel; no-op when DATABASE_URL is unset
 * (the app then uses in-process PGlite, which migrates itself).
 */
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.info("[migrate] DATABASE_URL not set — skipping (PGlite fallback).");
    return;
  }
  const { Pool } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    console.info("[migrate] migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[migrate] failed", error);
  process.exit(1);
});
