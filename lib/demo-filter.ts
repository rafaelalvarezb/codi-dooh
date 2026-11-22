import "server-only";
import { cookies } from "next/headers";

/** Per-browser admin preference: hide seeded demo data from totals and lists. */
export const HIDE_DEMO_COOKIE = "codidooh_hide_demo";

export async function hideDemo(): Promise<boolean> {
  return (await cookies()).get(HIDE_DEMO_COOKIE)?.value === "1";
}
