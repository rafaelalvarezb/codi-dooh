/** Pure path rules shared by the browser and the server (no Node imports). */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const SOURCE_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "mkv", "avi", ...IMAGE_EXTENSIONS] as const;
export type SourceExtension = (typeof SOURCE_EXTENSIONS)[number];
export const SOURCE_EXT_RE = new RegExp(`\\.(${SOURCE_EXTENSIONS.join("|")})$`, "i");

/** Extension for a picked file, defaulting to mp4 when the name has none we know. */
export function sourceExtension(fileName: string): SourceExtension {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (SOURCE_EXTENSIONS as readonly string[]).includes(ext) ? (ext as SourceExtension) : "mp4";
}

/** Images become a still spot; everything else is a video. */
export function isImageSource(nameOrUrl: string): boolean {
  const ext = nameOrUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}
