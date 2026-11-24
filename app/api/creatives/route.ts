import { createWriteStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiViewer, orgCtx } from "@/lib/auth/dal";
import { createCreative } from "@/lib/data/creatives";
import { ValidationError } from "@/lib/data/context";
import { badRequest, errorResponse } from "@/lib/http";
import { newId } from "@/lib/ids";
import { isOwnedUploadUrl, LOCAL_UPLOAD_DIR, LOCAL_UPLOAD_ROUTE, orgUploadPrefix, storageMode } from "@/lib/storage";
import { probeMp4 } from "@/lib/video/probe";
import { isImageSource } from "@/lib/storage-paths";
import {
  checkCreative,
  checkSource,
  clampTrimStart,
  IMAGE_DURATION_SEC,
  MAX_CREATIVE_BYTES,
  MAX_CREATIVE_MB,
  MAX_DURATION_SEC,
  needsTrim,
} from "@/lib/video/rules";
import { extractPoster, inspectSource, transcodeForKiosk, type CutOptions } from "@/lib/video/transcode";

/** Conversion of a 30 s 1080p spot takes ~10–60 s on a serverless CPU. */
export const maxDuration = 300;

const BodySchema = z.object({
  label: z.string().trim().min(1, "Ponle un nombre al video.").max(80),
  /** The original the browser uploaded to creatives/<org>/src/. */
  sourceUrl: z.string().min(1).max(1024),
  /** Start of the 15 s cut for longer videos (the advertiser picks it). */
  trimStartMs: z.number().int().min(0).max(24 * 3600 * 1000).optional(),
});

function localFileFor(url: string): string {
  const rel = decodeURIComponent(url.slice(LOCAL_UPLOAD_ROUTE.length + 1));
  const file = path.resolve(LOCAL_UPLOAD_DIR, rel);
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) throw new ValidationError("Archivo inválido.");
  return file;
}

/** Copies the uploaded original to a temp file, streaming (it can be 250 MB). */
async function downloadSource(url: string, dest: string): Promise<number> {
  if (storageMode() === "local") {
    await copyFile(localFileFor(url), dest);
    return (await stat(dest)).size;
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) throw new ValidationError("No encontramos el video subido.");
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_CREATIVE_BYTES) throw new ValidationError(`El archivo pesa más de ${MAX_CREATIVE_MB} MB.`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
  return (await stat(dest)).size;
}

async function store(pathname: string, file: string, contentType: string): Promise<string> {
  if (storageMode() === "local") {
    const dest = path.join(LOCAL_UPLOAD_DIR, pathname);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(file, dest);
    return `${LOCAL_UPLOAD_ROUTE}/${pathname}`;
  }
  const { put } = await import("@vercel/blob");
  const result = await put(pathname, await readFile(file), { access: "public", contentType, addRandomSuffix: true });
  return result.url;
}

async function removeSource(url: string): Promise<void> {
  try {
    if (storageMode() === "local") await unlink(localFileFor(url));
    else await (await import("@vercel/blob")).del(url);
  } catch (err) {
    console.warn("[creatives] could not delete original", err);
  }
}

/**
 * Turns an uploaded original (MP4, MOV, HEVC, WebM, MKV…) into a creative:
 * checks it, converts it to the kiosk format with ffmpeg, stores the MP4 and
 * a poster, deletes the original. Never trusts the browser's metadata.
 */
export async function POST(request: Request) {
  const { viewer, error } = await apiViewer();
  if (error) return error;
  if (!viewer.org) return NextResponse.json({ error: "Elige una organización." }, { status: 403 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { label, sourceUrl, trimStartMs } = parsed.data;
  const image = isImageSource(sourceUrl);
  if (!isOwnedUploadUrl(sourceUrl, viewer.org.id, "source")) return badRequest("Video inválido.");

  const dir = await mkdtemp(path.join(os.tmpdir(), "creative-"));
  try {
    const input = path.join(dir, "source");
    const sizeBytes = await downloadSource(sourceUrl, input);

    const output = path.join(dir, "kiosk.mp4");
    let converted = true;
    let cut: CutOptions = {};
    try {
      const info = await inspectSource(input);
      if (!info) throw new ValidationError(image ? "No pudimos leer la imagen. Prueba con JPG o PNG." : "No pudimos leer el video. Prueba con otro archivo.");
      const errors = checkSource({ ...info, sizeBytes, image });
      if (errors.length) throw new ValidationError(errors.join(" "));
      if (image) cut = { image: true, durationSec: IMAGE_DURATION_SEC };
      else if (needsTrim(info.durationMs)) {
        cut = { trimStartMs: clampTrimStart(trimStartMs, info.durationMs), durationSec: MAX_DURATION_SEC };
      }
      await transcodeForKiosk(input, output, cut);
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      // Images and cuts need ffmpeg; there is no original to fall back to.
      if (image || cut.durationSec) throw new ValidationError("No pudimos preparar este archivo. Intenta de nuevo en un momento.");
      // ffmpeg missing or failing on this server: fall back to the original
      // when it already plays on the kiosk (H.264 MP4), as before conversion.
      console.error("[creatives] conversion unavailable, trying original", err);
      const src = await readFile(input);
      const probe = probeMp4(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength) as ArrayBuffer);
      const check = probe ? checkCreative({ ...probe, sizeBytes: src.byteLength }) : null;
      if (!check?.ok) {
        if (err instanceof Error && err.message === "TIMEOUT") {
          throw new ValidationError("El video tardó demasiado en procesarse. Prueba con un archivo más ligero.");
        }
        throw new ValidationError(check?.errors.join(" ") || "No pudimos convertir este video. Prueba con otro archivo.");
      }
      await copyFile(input, output);
      converted = false;
    }
    const outBuf = await readFile(output);
    const probe = probeMp4(outBuf.buffer.slice(outBuf.byteOffset, outBuf.byteOffset + outBuf.byteLength) as ArrayBuffer);
    if (!probe) throw new Error("converted file unreadable");

    const posterFile = path.join(dir, "poster.jpg");
    const hasPoster = converted && (await extractPoster(output, posterFile, probe.durationMs).catch(() => false));

    const base = `${orgUploadPrefix(viewer.org.id)}${newId("v", 10)}`;
    const blobUrl = await store(`${base}.mp4`, output, "video/mp4");
    const posterUrl = hasPoster ? await store(`${base}-poster.jpg`, posterFile, "image/jpeg").catch(() => null) : null;

    const creative = await createCreative(orgCtx({ ...viewer, org: viewer.org }), {
      label,
      blobUrl,
      posterUrl,
      meta: { ...probe, sizeBytes: outBuf.byteLength },
    });
    await removeSource(sourceUrl);
    return NextResponse.json({ creative }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "creatives");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
