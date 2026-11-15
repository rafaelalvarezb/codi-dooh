import type { UseCaseId } from "@/lib/types";

/** Cobro always-on (baño) vs espera de boleto/monto (parking/lavandería). */
export type BillingMode = "fixed" | "dynamic";

export type KioskProfileId = "bathroom" | "parking" | "laundry";

export interface KioskProfile {
  id: KioskProfileId;
  billingMode: BillingMode;
  useCaseId: UseCaseId;
  /** Título que ve el pagador cuando hay cobro activo. */
  serviceTitle: string;
  /** Copy en espera (solo dynamic). */
  standbyTitle: string;
  standbyBody: string;
  /** Mensaje de éxito configurable (luego vendrá del portal). */
  successMessage: string;
  /** Monto mostrado (= monto QR en hackathon). */
  amountMxn: number;
  /** Auto-generar QR al entrar a checkout (baño). */
  autoStartQr: boolean;
}

export const KIOSK_PROFILES: Record<KioskProfileId, KioskProfile> = {
  bathroom: {
    id: "bathroom",
    billingMode: "fixed",
    useCaseId: "restroom",
    serviceTitle: "Acceso al baño",
    standbyTitle: "",
    standbyBody: "",
    successMessage: "Ya puedes pasar",
    amountMxn: 0.01,
    autoStartQr: true,
  },
  parking: {
    id: "parking",
    billingMode: "dynamic",
    useCaseId: "parking",
    serviceTitle: "Pago de estacionamiento",
    standbyTitle: "Listo para cobrar",
    standbyBody:
      "Inserta o escanea tu boleto. El cobro con CoDi aparece aquí sin comisión.",
    successMessage: "Tu boleto está pagado",
    amountMxn: 0.01,
    autoStartQr: true,
  },
  laundry: {
    id: "laundry",
    billingMode: "dynamic",
    useCaseId: "laundry",
    serviceTitle: "Recarga de lavandería",
    standbyTitle: "Listo para cobrar",
    standbyBody:
      "Confirma tu recarga. El cobro con CoDi aparece aquí sin comisión.",
    successMessage: "Saldo cargado a tu tarjeta",
    amountMxn: 0.01,
    autoStartQr: true,
  },
};

export function resolveProfile(
  raw?: string | null,
): KioskProfile {
  if (raw && raw in KIOSK_PROFILES) {
    return KIOSK_PROFILES[raw as KioskProfileId];
  }
  return KIOSK_PROFILES.parking;
}
