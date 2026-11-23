/**
 * cobten logo. The symbol is the kiosk seen from the front: the frame is the
 * tablet, the block is the advertiser's video and the green square is the
 * payment. Redrawn from the brand sheet; swap for the original SVG if needed.
 */
export const COBTEN_GREEN = "#3A8A5C";

type Tone = "ink" | "white" | "mono";

export function CobtenSymbol({
  tone = "ink",
  className,
  title,
}: {
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  const ink = tone === "white" ? "#FFFFFF" : "#0A0A0B";
  const fill = tone === "white" ? "transparent" : tone === "mono" ? "transparent" : "#FFFFFF";
  const dot = tone === "mono" ? ink : COBTEN_GREEN;
  return (
    <svg
      viewBox="0 0 140 108"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect x="6" y="6" width="128" height="96" rx="24" fill={fill} stroke={ink} strokeWidth="12" />
      <rect x="23" y="23" width="70" height="62" rx="8" fill={ink} />
      <rect x="101" y="67" width="18" height="18" rx="4" fill={dot} />
    </svg>
  );
}

/** Symbol + wordmark. Height follows the font size of the container. */
export function CobtenLogo({
  tone = "ink",
  className = "",
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[0.32em] leading-none font-semibold tracking-[-0.055em] ${
        tone === "white" ? "text-white" : "text-[#0A0A0B]"
      } ${className}`}
      aria-label="cobten"
      role="img"
    >
      <CobtenSymbol tone={tone} className="h-[1.05em] w-auto shrink-0 translate-y-[0.04em]" />
      <span aria-hidden className="-translate-y-[0.03em]">
        cobten
      </span>
    </span>
  );
}
