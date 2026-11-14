import type { UseCaseConfig, UseCaseId } from "@/lib/types";

/** Hackathon fixed test amount — Pey recommends $0.01 MXN in production. */
export const HACKATHON_AMOUNT_MXN = 0.01;

export const USE_CASES: Record<UseCaseId, UseCaseConfig> = {
  parking: {
    id: "parking",
    label: "Estacionamiento",
    serviceTitle: "Salida de estacionamiento",
    ticketLabel: "Ticket #A-2841 · Zona B",
    successAction: "Pluma abierta",
    relayLabel: "Relé → pluma de acceso",
    accent: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.18)",
    doohCampaigns: [
      {
        id: "pk-1",
        brand: "MOVISTAR",
        headline: "5G en cada cuadra",
        subline: "Velocidad que se siente al salir del parking.",
        gradient: "linear-gradient(145deg, #0b1220 0%, #102a43 45%, #064e3b 100%)",
        cta: "Conoce el plan",
      },
      {
        id: "pk-2",
        brand: "UBER EATS",
        headline: "Llega a casa listo",
        subline: "Pedido caliente mientras pagas tu ticket.",
        gradient: "linear-gradient(145deg, #1a0b0b 0%, #3f1515 50%, #7f1d1d 100%)",
        cta: "Ordena ahora",
      },
      {
        id: "pk-3",
        brand: "BBVA",
        headline: "Tu dinero, al instante",
        subline: "SPEI en segundos. Sin filas. Sin efectivo.",
        gradient: "linear-gradient(145deg, #020617 0%, #0c1a3a 50%, #1e3a8a 100%)",
        cta: "Abre tu cuenta",
      },
    ],
  },
  laundry: {
    id: "laundry",
    label: "Lavandería / Recarga",
    serviceTitle: "Recarga de lavadora",
    ticketLabel: "Máquina L-07 · Ciclo Express",
    successAction: "Ciclo iniciado",
    relayLabel: "Relé → activación de máquina",
    accent: "#38bdf8",
    accentSoft: "rgba(56, 189, 248, 0.18)",
    doohCampaigns: [
      {
        id: "ld-1",
        brand: "DOWNY",
        headline: "Frescura que dura",
        subline: "El aroma premium para cada ciclo.",
        gradient: "linear-gradient(145deg, #0c1222 0%, #1e1b4b 45%, #312e81 100%)",
        cta: "Descubre más",
      },
      {
        id: "ld-2",
        brand: "OXXO PAY",
        headline: "Recarga sin efectivo",
        subline: "Digital, rápido y sin comisiones ocultas.",
        gradient: "linear-gradient(145deg, #0a0a0a 0%, #171717 40%, #404040 100%)",
        cta: "Paga digital",
      },
      {
        id: "ld-3",
        brand: "SPOTIFY",
        headline: "Playlist del ciclo",
        subline: "30 min de música mientras tu ropa gira.",
        gradient: "linear-gradient(145deg, #022c22 0%, #064e3b 50%, #14532d 100%)",
        cta: "Escucha gratis",
      },
    ],
  },
  restroom: {
    id: "restroom",
    label: "Baños Públicos",
    serviceTitle: "Acceso a baño",
    ticketLabel: "Cabina C-03 · Acceso único",
    successAction: "Torniquete liberado",
    relayLabel: "Relé → torniquete / chapa",
    accent: "#fbbf24",
    accentSoft: "rgba(251, 191, 36, 0.18)",
    doohCampaigns: [
      {
        id: "rs-1",
        brand: "COLGATE",
        headline: "Sonrisa lista",
        subline: "Higiene premium en cada parada.",
        gradient: "linear-gradient(145deg, #0f172a 0%, #1e293b 45%, #0ea5e9 100%)",
        cta: "Cuida tu sonrisa",
      },
      {
        id: "rs-2",
        brand: "KLEENEX",
        headline: "Limpieza en movimiento",
        subline: "Comodidad para espacios públicos.",
        gradient: "linear-gradient(145deg, #111827 0%, #1f2937 50%, #374151 100%)",
        cta: "Ver producto",
      },
      {
        id: "rs-3",
        brand: "PEYA",
        headline: "Ciudades más limpias",
        subline: "Infraestructura digital para el espacio público.",
        gradient: "linear-gradient(145deg, #18181b 0%, #27272a 40%, #52525b 100%)",
        cta: "Conoce más",
      },
    ],
  },
};

export const USE_CASE_LIST = Object.values(USE_CASES);

export function getUseCase(id: string): UseCaseConfig {
  if (id in USE_CASES) return USE_CASES[id as UseCaseId];
  return USE_CASES.parking;
}

export function buildConcept(useCase: UseCaseConfig): string {
  return `CODI-DOOH · ${useCase.serviceTitle}`;
}

/** Banxico numRef: 1–7 digits only. */
export function buildNumRef(): string {
  const n = Math.floor(Date.now() % 10_000_000);
  return String(n).padStart(4, "0").slice(-7);
}
