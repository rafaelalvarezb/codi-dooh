import { NextResponse } from "next/server";
import { getRecentRelayEvents } from "@/lib/relay";

export async function GET() {
  return NextResponse.json({ events: getRecentRelayEvents() });
}
