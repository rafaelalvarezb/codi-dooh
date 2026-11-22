/** Host catalog shared by server and client (no server imports here). */

export const SITE_KINDS = ["parking", "restroom", "laundry", "vending"] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

export const SCREEN_PROFILES = ["parking", "bathroom", "laundry"] as const;
export type ScreenProfile = (typeof SCREEN_PROFILES)[number];

export const SITE_KIND_LABEL: Record<SiteKind, string> = {
  parking: "Estacionamiento",
  restroom: "Baño",
  laundry: "Lavandería",
  vending: "Máquina expendedora",
};

/** How the kiosk charges (existing CoDi checkout flows). */
export const PROFILE_LABEL: Record<ScreenProfile, { title: string; body: string }> = {
  parking: { title: "Cobro por boleto", body: "El monto cambia en cada cobro, como en un estacionamiento." },
  bathroom: { title: "Cobro fijo", body: "Siempre el mismo monto, como la entrada a un baño." },
  laundry: { title: "Recarga", body: "La persona confirma un monto, como en una lavandería o una máquina." },
};

/** Suggested kiosk checkout flow for each kind of site. */
export const DEFAULT_PROFILE: Record<SiteKind, ScreenProfile> = {
  parking: "parking",
  restroom: "bathroom",
  laundry: "laundry",
  vending: "laundry",
};
