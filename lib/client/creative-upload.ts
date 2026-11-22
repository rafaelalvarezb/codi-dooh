"use client";

import { checkCreative, type CreativeCheck, type VideoMeta } from "@/lib/video/rules";

export type UploadMode = "blob" | "local" | "none";

/** Reads codec/duration/size in the browser for instant feedback (server re-checks). */
export async function inspectFile(file: File): Promise<{ meta: VideoMeta | null; check: CreativeCheck | null }> {
  if (!/\.mp4$/i.test(file.name) && file.type !== "video/mp4") {
    return { meta: null, check: null };
  }
  const { probeMp4 } = await import("@/lib/video/probe");
  const probe = probeMp4(await file.arrayBuffer());
  if (!probe) return { meta: null, check: null };
  const meta: VideoMeta = { ...probe, sizeBytes: file.size };
  return { meta, check: checkCreative(meta) };
}

/** Grabs a frame (~1 s in) as a JPEG: thumbnail + blurred backdrop for portrait spots. */
export async function capturePoster(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("load"));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function slug(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function putFile(
  mode: UploadMode,
  pathname: string,
  body: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (mode === "local") {
    const res = await fetch(`/api/dev-uploads/${pathname}`, { method: "PUT", body, headers: { "Content-Type": contentType } });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo subir el archivo.");
    onProgress?.(100);
    return data.url;
  }
  if (mode !== "blob") throw new Error("La subida de videos no está disponible.");
  const { uploadPresigned } = await import("@vercel/blob/client");
  const result = await uploadPresigned(pathname, body, {
    access: "public",
    handleUploadUrl: "/api/creatives/upload",
    contentType,
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  });
  return result.url;
}

export async function uploadCreative(opts: {
  file: File;
  poster: Blob | null;
  orgId: string;
  mode: UploadMode;
  onProgress?: (pct: number) => void;
}): Promise<{ videoUrl: string; posterUrl: string | null }> {
  const base = `creatives/${opts.orgId}/${slug()}`;
  const videoUrl = await putFile(opts.mode, `${base}.mp4`, opts.file, "video/mp4", (pct) =>
    opts.onProgress?.(Math.min(95, pct * 0.95)),
  );
  let posterUrl: string | null = null;
  if (opts.poster) {
    posterUrl = await putFile(opts.mode, `${base}-poster.jpg`, opts.poster, "image/jpeg").catch(() => null);
  }
  opts.onProgress?.(100);
  return { videoUrl, posterUrl };
}
