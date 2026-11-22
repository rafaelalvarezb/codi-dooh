/**
 * npm run db:seed — loads demo data into DATABASE_URL (or local PGlite when
 * the dev server is stopped). The admin can do the same from /admin.
 */
import { seedDemo } from "@/lib/seed";

seedDemo()
  .then((r) => {
    console.info(`[seed] demo data ready (${r.screens} demo screens, ${r.skipped ? "history already present" : `${r.plays} plays and ${r.payments} payments added`}).`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exit(1);
  });
