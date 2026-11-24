"use client";

import { sourceExtension } from "@/lib/storage-paths";
import { checkSource } from "@/lib/video/rules";

export type UploadMode = "blob" | "local" | "none";

export type SourceMeta = { durationMs: number; width: number; height: number };

/**
 * Reads duration and size with the browser's own player, for instant feedback.
 * Returns null when this browser can't decode the file (e.g. MKV, or HEVC on
 * some systems): it still uploads, and the server converts and re-checks it.
 */
export async function readSourceMeta(file: File): Promise<SourceMeta | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 8000);
      video.onloadedmetadata = () => {
        clearTimeout(t);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(t);
        reject(new Error("decode"));
      };
    });
    if (!Number.isFinite(video.duration) || !video.videoWidth) return null;
    return { durationMs: Math.round(video.duration * 1000), width: video.videoWidth, height: video.videoHeight };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Browser-side checks on the original (server repeats them). */
export function precheck(file: File, meta: SourceMeta | null): string[] {
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name)) {
    return ["Ese archivo no es un video."];
  }
  return checkSource({ durationMs: meta?.durationMs ?? 10_000, width: meta?.width ?? 0, height: meta?.height ?? 0, sizeBytes: file.size });
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

/** Uploads the original as-is into creatives/<org>/src/; returns its URL. */
export async function uploadSource(opts: {
  file: File;
  orgId: string;
  mode: UploadMode;
  onProgress?: (pct: number) => void;
}): Promise<string> {
  const ext = sourceExtension(opts.file.name);
  const pathname = `creatives/${opts.orgId}/src/${slug()}.${ext}`;
  const contentType = opts.file.type || "application/octet-stream";
  const url = await putFile(opts.mode, pathname, opts.file, contentType, opts.onProgress);
  opts.onProgress?.(100);
  return url;
}
