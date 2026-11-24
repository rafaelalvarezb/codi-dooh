/**
 * Where creative files live.
 * - "blob": Vercel Blob (BLOB_STORE_ID + OIDC on Vercel, or BLOB_READ_WRITE_TOKEN).
 * - "local": dev-only fallback in .data/uploads served by /api/dev-uploads.
 * - "none": production without Blob configured (uploads disabled).
 */
import path from "node:path";
import { SOURCE_EXT_RE } from "./storage-paths";

export { SOURCE_EXTENSIONS, sourceExtension } from "./storage-paths";

export type StorageMode = "blob" | "local" | "none";

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
export const LOCAL_UPLOAD_ROUTE = "/api/dev-uploads";

export function storageMode(): StorageMode {
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.NODE_ENV === "production" ? "none" : "local";
}

/** Public hostname of our Blob store, if we can tell (store_abc → abc.public.blob…). */
function storeHostPrefix(): string | null {
  const id =
    process.env.BLOB_STORE_ID ??
    process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z0-9]+)_/i)?.[1];
  if (!id) return null;
  return id.replace(/^store_/, "").toLowerCase();
}

export function orgUploadPrefix(orgId: string): string {
  return `creatives/${orgId}/`;
}

/**
 * Originals the browser uploads go to `creatives/<org>/src/`; the server
 * converts them and writes the kiosk MP4 + poster next to that folder.
 */
export function orgSourcePrefix(orgId: string): string {
  return `${orgUploadPrefix(orgId)}src/`;
}

/**
 * Accepts only files uploaded by this org into our own store, so nobody can
 * attach someone else's video or a URL they can swap after review.
 */
export function isOwnedUploadUrl(url: string, orgId: string, kind: "source" | "mp4" | "jpg"): boolean {
  const prefix = kind === "source" ? orgSourcePrefix(orgId) : orgUploadPrefix(orgId);
  const extRe = kind === "source" ? SOURCE_EXT_RE : new RegExp(`\\.${kind}$`, "i");
  const mode = storageMode();
  if (mode === "local") {
    const expected = `${LOCAL_UPLOAD_ROUTE}/${prefix}`;
    return url.startsWith(expected) && !url.includes("..") && extRe.test(url);
  }
  if (mode !== "blob") return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = storeHostPrefix();
  return (
    parsed.protocol === "https:" &&
    parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
    (!host || parsed.hostname.startsWith(`${host}.`)) &&
    parsed.pathname.startsWith(`/${prefix}`) &&
    extRe.test(parsed.pathname)
  );
}

/** What the browser may upload: originals only, into its own org's src/ folder. */
export function isAllowedUploadPathname(pathname: string, orgId: string): boolean {
  return (
    pathname.startsWith(orgSourcePrefix(orgId)) &&
    !pathname.includes("..") &&
    /^[a-z0-9/_.-]+$/i.test(pathname) &&
    SOURCE_EXT_RE.test(pathname) &&
    pathname.length <= 200
  );
}
