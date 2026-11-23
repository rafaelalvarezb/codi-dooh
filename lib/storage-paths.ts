/** Pure path rules shared by the browser and the server (no Node imports). */
export const SOURCE_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "mkv", "avi"] as const;
export type SourceExtension = (typeof SOURCE_EXTENSIONS)[number];
export const SOURCE_EXT_RE = new RegExp(`\\.(${SOURCE_EXTENSIONS.join("|")})$`, "i");

/** Extension for a picked file, defaulting to mp4 when the name has none we know. */
export function sourceExtension(fileName: string): SourceExtension {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (SOURCE_EXTENSIONS as readonly string[]).includes(ext) ? (ext as SourceExtension) : "mp4";
}
