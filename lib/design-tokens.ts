/**
 * CODI-DOOH design system tokens.
 * Iterate here — do not invent one-off colors in components.
 */
export const tokens = {
  color: {
    bg: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F3F5",
    border: "#E5E7EB",
    text: "#0B0F14",
    textSecondary: "#5B6570",
    textMuted: "#8B949E",
    accent: "#0B0F14",
    success: "#12B76A",
    successSoft: "rgba(18, 183, 106, 0.12)",
    danger: "#D92D20",
    dangerSoft: "rgba(217, 45, 32, 0.1)",
    codiBlack: "#000000",
  },
  radius: {
    sm: "10px",
    md: "16px",
    lg: "24px",
  },
  layout: {
    dooh: "7fr",
    pay: "3fr",
  },
} as const;
