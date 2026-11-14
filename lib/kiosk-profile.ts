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
    successMessage: "Puedes pasar",
    amountMxn: 0.01,
    autoStartQr: true,
  },
  parking: {
    id: "parking",
    billingMode: "dynamic",
    useCaseId: "parking",
    serviceTitle: "Pago de estacionamiento",
    standbyTitle: "Pago con CoDi",
    standbyBody:
      "Esta máquina acepta pago con transferencia QR CoDi® sin comisión. Inserta o escanea tu boleto para continuar.",
    successMessage: "Pago exitoso",
    amountMxn: 0.01,
    autoStartQr: true,
  },
  laundry: {
    id: "laundry",
    billingMode: "dynamic",
    useCaseId: "laundry",
    serviceTitle: "Recarga de lavandería",
    standbyTitle: "Pago con CoDi",
    standbyBody:
      "Esta máquina acepta pago con transferencia QR CoDi® sin comisión. Selecciona o confirma tu recarga para continuar.",
    successMessage: "Pago exitoso",
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
