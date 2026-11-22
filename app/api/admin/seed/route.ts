import { NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth/dal";
import { seedDemo } from "@/lib/seed";

/** Platform admin only: load (or refresh) the pitch demo data. Idempotent. */
export async function POST() {
  const { error } = await apiViewer("admin");
  if (error) return error;
  try {
    const result = await seedDemo();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/seed]", err);
    return NextResponse.json({ error: "No se pudieron cargar los datos de demo." }, { status: 500 });
  }
}
