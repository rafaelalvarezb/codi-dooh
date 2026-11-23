import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { createLead } from "@/lib/data/leads";
import { badRequest, errorResponse } from "@/lib/http";
import { LeadSchema } from "@/lib/leads-schema";
import { notifyNewLead } from "@/lib/notifications";

const MAX_BODY_BYTES = 4 * 1024;
const LIMIT_PER_HOUR = 5;

/** Public "Agenda una demo" form on cobten.com. Stored for /admin/contactos. */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return badRequest("Mensaje demasiado largo.");
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest("Revisa los datos.");
  }
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const { website, ...data } = parsed.data;
  // Bots fill the hidden field: pretend it worked, store nothing.
  if (website) return NextResponse.json({ ok: true }, { status: 201 });

  const limit = await rateLimit(`lead:${clientIp(request.headers)}`, LIMIT_PER_HOUR, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Ya recibimos tus datos. Te escribimos pronto." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  try {
    await createLead(data);
  } catch (err) {
    return errorResponse(err, "leads");
  }
  // The request is saved either way; a failed email only gets logged.
  await notifyNewLead(data).catch((err) => console.error("[leads] notify", err));
  return NextResponse.json({ ok: true }, { status: 201 });
}
