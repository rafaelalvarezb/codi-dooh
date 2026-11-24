import { ImageResponse } from "next/og";

export const alt = "cobten · Pagas con tu banco. Sales en segundos.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for cobten.com, drawn from the logo (no photo needed). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(70% 70% at 75% 80%, rgba(79,191,126,0.35), transparent 70%), #08080A",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="92" height="71" viewBox="0 0 140 108">
            <rect x="6" y="6" width="128" height="96" rx="24" fill="none" stroke="#fff" strokeWidth="12" />
            <rect x="23" y="23" width="70" height="62" rx="8" fill="#fff" />
            <rect x="101" y="67" width="18" height="18" rx="4" fill="#4FBF7E" />
          </svg>
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: -3 }}>cobten</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 84, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>Pagas con tu banco.</span>
          <span style={{ fontSize: 84, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05, color: "rgba(255,255,255,0.45)" }}>
            Sales en segundos.
          </span>
          <span style={{ marginTop: 28, fontSize: 30, color: "rgba(255,255,255,0.6)" }}>
            Paga tu estacionamiento con CoDi
          </span>
        </div>
      </div>
    ),
    size,
  );
}
