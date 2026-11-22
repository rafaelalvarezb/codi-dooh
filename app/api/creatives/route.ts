import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer, orgCtx } from "@/lib/auth/dal";
import { createCreative } from "@/lib/data/creatives";
import { ValidationError } from "@/lib/data/context";
import { badRequest, errorResponse } from "@/lib/http";
import { isOwnedUploadUrl, LOCAL_UPLOAD_DIR, LOCAL_UPLOAD_ROUTE, storageMode } from "@/lib/storage";
import { probeMp4 } from "@/lib/video/probe";
import { MAX_CREATIVE_BYTES } from "@/lib/video/rules";

const BodySchema = z.object({
  label: z.string().trim().min(1, "Ponle un nombre al video.").max(80),
  blobUrl: z.string().min(1).max(1024),
  posterUrl: z.string().min(1).max(1024).nullable().optional(),
});

async function readUploaded(url: string): Promise<ArrayBuffer> {
  if (storageMode() === "local") {
    const rel = decodeURIComponent(url.slice(LOCAL_UPLOAD_ROUTE.length + 1));
    const file = path.resolve(LOCAL_UPLOAD_DIR, rel);
    if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) throw new ValidationError("Archivo inválido.");
    const buf = await readFile(file);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new ValidationError("No encontramos el video subido.");
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_CREATIVE_BYTES) throw new ValidationError("El archivo pesa más de 50 MB.");
  const data = await res.arrayBuffer();
  if (data.byteLength > MAX_CREATIVE_BYTES) throw new ValidationError("El archivo pesa más de 50 MB.");
  return data;
}

/**
 * Registers an uploaded video as a creative. The server never trusts the
 * browser's metadata: it re-downloads the file and probes it itself.
 */
export async function POST(request: Request) {
  const { viewer, error } = await apiViewer();
  if (error) return error;
  if (!viewer.org) return NextResponse.json({ error: "Elige una organización." }, { status: 403 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { label, blobUrl } = parsed.data;
  const posterUrl = parsed.data.posterUrl ?? null;

  if (!isOwnedUploadUrl(blobUrl, viewer.org.id, "mp4")) return badRequest("Video inválido.");
  if (posterUrl && !isOwnedUploadUrl(posterUrl, viewer.org.id, "jpg")) return badRequest("Imagen inválida.");

  try {
    const data = await readUploaded(blobUrl);
    const probe = probeMp4(data);
    if (!probe) throw new ValidationError("No pudimos leer el video. Debe ser un MP4 válido.");
    const creative = await createCreative(orgCtx({ ...viewer, org: viewer.org }), {
      label,
      blobUrl,
      posterUrl,
      meta: { ...probe, sizeBytes: data.byteLength },
    });
    return NextResponse.json({ creative }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "creatives");
  }
}
