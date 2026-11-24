import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { LANDING_IMAGES, type LandingImage } from "@/lib/landing-images";
import { IconImage } from "./icons";

const EXTENSIONS = ["webp", "jpg", "jpeg", "png", "avif"];

/** Public path of `public/landing/<name>.<ext>` for the first extension found. */
export function findLandingFile(name: string, extensions: readonly string[] = EXTENSIONS): string | null {
  for (const ext of extensions) {
    const rel = `/landing/${name}.${ext}`;
    if (fs.existsSync(path.join(process.cwd(), "public", rel))) return rel;
  }
  return null;
}

const findFile = (name: string) => findLandingFile(name);

/**
 * Shows public/landing/<name>.* when it exists; otherwise a placeholder that
 * names the file to add. Resolved at build time (static page).
 */
export function ImageSlot({
  name,
  tone = "light",
  className = "",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  fill = false,
  ratio,
  placeholder = true,
}: {
  name: LandingImage;
  tone?: "light" | "dark";
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Fill the parent instead of keeping the slot's aspect ratio. */
  fill?: boolean;
  /** Override the slot's aspect ratio for this placement, e.g. "16/9". */
  ratio?: string;
  /** false: render nothing until the image exists (for backgrounds). */
  placeholder?: boolean;
}) {
  const meta = LANDING_IMAGES[name];
  const src = findFile(name);
  const style = fill ? undefined : { aspectRatio: ratio ?? meta.ratio };
  const base = `relative overflow-hidden ${fill ? "size-full" : "w-full"} ${className}`;

  if (src) {
    return (
      <div className={base} style={style}>
        <Image src={src} alt={meta.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  if (!placeholder) return null;
  const dark = tone === "dark";
  return (
    <div
      className={`${base} flex items-center justify-center ${
        dark ? "bg-white/[0.04] text-white/45 ring-1 ring-white/10 ring-inset" : "bg-[#e6e7ea] text-[#6b6b73]"
      }`}
      style={style}
      role="img"
      aria-label={meta.alt}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `radial-gradient(${dark ? "rgba(255,255,255,.09)" : "rgba(10,10,11,.09)"} 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
        }}
      />
      <div
        aria-hidden
        className={`absolute inset-0 ${
          dark
            ? "bg-[radial-gradient(60%_60%_at_30%_20%,rgba(79,191,126,.12),transparent_70%)]"
            : "bg-[radial-gradient(60%_60%_at_30%_20%,rgba(255,255,255,.9),transparent_70%)]"
        }`}
      />
      <div className="relative flex max-w-[80%] flex-col items-center gap-2 text-center">
        <IconImage className="size-6" />
        <span className="font-mono text-[11px] tracking-[0.06em]">landing/{name}.webp</span>
        <span className="text-[12px] opacity-80">{(ratio ?? meta.ratio).replace("/", ":")}</span>
      </div>
    </div>
  );
}
