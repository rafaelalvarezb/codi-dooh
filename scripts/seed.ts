/**
 * npm run db:seed — loads the pitch demo data (all flagged isDemo).
 *
 * - With DATABASE_URL: seeds that database (e.g. Neon).
 * - Without it: seeds the local database that `npm run dev` uses
 *   (.data/pglite). Stop the dev server first, or use the button in /admin.
 *
 * Safe to run again: demo activity is replaced by the last 14 days (never
 * duplicated); real data is never touched.
 */
import { connect } from "node:net";
import { seedDemo } from "@/lib/seed";
import { openLocalPersistentDb, usingRealDatabase } from "@/lib/db";

/** True if something listens on the dev port (a TCP check: fast even while Next compiles). */
function devServerRunning(port = Number(process.env.PORT) || 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function main() {
  if (!usingRealDatabase()) {
    if (await devServerRunning()) {
      console.error(
        "[seed] The dev server is running and has the local database open.\n" +
          "       Stop it first (Ctrl+C in its terminal), or open /admin and press “Cargar datos de demo”.",
      );
      process.exit(1);
    }
    await openLocalPersistentDb();
    console.info("[seed] DATABASE_URL not set — seeding the local database (.data/pglite).");
  }
  const r = await seedDemo();
  console.info(
    `[seed] Demo data ready: ${r.screens} demo screens, last 14 days with ${r.plays} plays and ${r.payments} CoDi payments.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
