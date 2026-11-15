import { NextResponse } from "next/server";
import { listMachines } from "@/lib/machines";
import { listPayments, paymentStats } from "@/lib/payment-store";
import { getPortalSession } from "@/lib/portal-auth";

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    email: session.email,
    machines: listMachines(),
    payments: listPayments(50),
    stats: paymentStats(),
  });
}
