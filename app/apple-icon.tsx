import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon (iPad kiosk "Agregar a inicio"): the cobten symbol. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0B" }}>
        <svg width="124" height="96" viewBox="0 0 140 108">
          <rect x="6" y="6" width="128" height="96" rx="24" fill="none" stroke="#fff" strokeWidth="12" />
          <rect x="23" y="23" width="70" height="62" rx="8" fill="#fff" />
          <rect x="101" y="67" width="18" height="18" rx="4" fill="#4FBF7E" />
        </svg>
      </div>
    ),
    size,
  );
}
