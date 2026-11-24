/**
 * Dev-only stand-in for Vercel Blob when no store is configured locally.
 * PUT stores a file under .data/uploads; GET serves it with Range support
 * (video players seek with Range requests). Disabled unless storage is local.
 */
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/dal";
import { isAllowedUploadPathname, LOCAL_UPLOAD_DIR, LOCAL_UPLOAD_ROUTE, storageMode } from "@/lib/storage";
import { MAX_CREATIVE_BYTES } from "@/lib/video/rules";

function resolve(parts: string[]): { pathname: string; file: string } | null {
  const pathname = parts.join("/");
  const file = path.resolve(LOCAL_UPLOAD_DIR, pathname);
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return null;
  return { pathname, file };
}

export async function PUT(request: Request, { params }: RouteContext<"/api/dev-uploads/[...path]">) {
  if (storageMode() !== "local") return new NextResponse(null, { status: 404 });
  const viewer = await getViewer();
  if (!viewer?.org) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const target = resolve((await params).path);
  if (!target || !isAllowedUploadPathname(target.pathname, viewer.org.id)) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 403 });
  }
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length === 0 || data.length > MAX_CREATIVE_BYTES) {
    return NextResponse.json({ error: "Archivo vacío o demasiado grande." }, { status: 413 });
  }
  // Mimic Blob's random suffix so re-uploads never overwrite.
  const ext = path.extname(target.file);
  const suffix = Math.random().toString(36).slice(2, 10);
  const finalFile = target.file.slice(0, -ext.length) + `-${suffix}${ext}`;
  await mkdir(path.dirname(finalFile), { recursive: true });
  await writeFile(finalFile, data);
  const rel = path.relative(LOCAL_UPLOAD_DIR, finalFile).split(path.sep).join("/");
  return NextResponse.json({ url: `${LOCAL_UPLOAD_ROUTE}/${rel}` }, { status: 201 });
}

export async function GET(request: Request, { params }: RouteContext<"/api/dev-uploads/[...path]">) {
  if (storageMode() !== "local") return new NextResponse(null, { status: 404 });
  const target = resolve((await params).path);
  if (!target) return new NextResponse(null, { status: 404 });
  let size: number;
  try {
    size = (await stat(target.file)).size;
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  const type = target.file.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(target.file, { start, end })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(target.file)) as ReadableStream;
  return new NextResponse(stream, {
    headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" },
  });
}
