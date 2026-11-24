import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer } from "@/lib/auth/dal";
import { badRequest } from "@/lib/http";
import { updateSettings } from "@/lib/settings";

const Body = z.object({
  spotPriceMxn: z.number({ message: "Escribe el precio." }).int("Usa pesos enteros.").min(1, "El precio mínimo es $1.").max(1_000_000, "Revisa el precio."),
  commissionPct: z.number({ message: "Escribe la comisión." }).min(0, "Entre 0 y 100.").max(100, "Entre 0 y 100."),
  payoutDay: z.number({ message: "Escribe el día de pago." }).int().min(1, "Entre 1 y 28.").max(28, "Entre 1 y 28."),
});

export async function PUT(request: Request) {
  const { error } = await apiViewer("admin");
  if (error) return error;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const s = await updateSettings({
    defaultSpotPriceCents: parsed.data.spotPriceMxn * 100,
    commissionBps: Math.round(parsed.data.commissionPct * 100),
    payoutDay: parsed.data.payoutDay,
  });
  return NextResponse.json({ ok: true, settings: s });
}
