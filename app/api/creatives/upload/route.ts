import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { getViewer } from "@/lib/auth/dal";
import { isAllowedUploadPathname, storageMode } from "@/lib/storage";
import { MAX_CREATIVE_BYTES } from "@/lib/video/rules";

/**
 * Issues a short-lived presigned URL so the browser uploads straight to
 * Vercel Blob (function bodies are capped at ~4.5 MB). Only signed-in users
 * with an org, only into `creatives/<their org>/`, only MP4/JPEG up to MAX_CREATIVE_BYTES.
 */
export async function POST(request: Request) {
  if (storageMode() !== "blob") {
    return NextResponse.json({ error: "El almacenamiento de videos no está configurado." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as HandleUploadPresignedBody | null;
  if (!body || typeof body !== "object" || !("type" in body)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const viewer = await getViewer();
        if (!viewer?.org) throw new Error("UNAUTHORIZED");
        if (!isAllowedUploadPathname(pathname, viewer.org.id)) throw new Error("FORBIDDEN_PATH");
        const isVideo = pathname.toLowerCase().endsWith(".mp4");
        const allowedContentTypes = isVideo ? ["video/mp4"] : ["image/jpeg"];
        const maximumSizeInBytes = isVideo ? MAX_CREATIVE_BYTES : 2 * 1024 * 1024;
        const validUntil = Date.now() + 10 * 60 * 1000;
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes,
          maximumSizeInBytes,
          validUntil,
        });
        return {
          token,
          urlOptions: { allowedContentTypes, maximumSizeInBytes, validUntil, addRandomSuffix: true },
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Inicia sesión para subir videos." }, { status: 401 });
    }
    if (message === "FORBIDDEN_PATH") {
      return NextResponse.json({ error: "Ruta de archivo inválida." }, { status: 403 });
    }
    console.error("[creatives/upload]", error);
    return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });
  }
}
