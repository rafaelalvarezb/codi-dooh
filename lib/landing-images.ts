/**
 * Image slots on cobten.com. Drop `public/landing/<name>.webp` (or .jpg/.png)
 * and the slot shows it on the next deploy; until then a placeholder shows
 * the expected file name. Prompts for each: docs/landing-imagenes.md.
 */
export const LANDING_IMAGES = {
  "estacionamiento-plaza": { ratio: "16/9", alt: "Estacionamiento de una plaza con la zona de máquinas de cobro" },
  "paso-escanea": { ratio: "4/5", alt: "Una persona escanea el QR CoDi de la pantalla en la máquina de cobro" },
  "paso-confirma": { ratio: "4/5", alt: "Mano confirmando el pago del boleto en la app del banco" },
  "paso-sal": { ratio: "4/5", alt: "Con el boleto pagado, la persona camina de regreso a su auto" },
  "kiosco-anuncio": { ratio: "16/9", alt: "Máquina de cobro con la pantalla cobten mostrando un anuncio" },
  "marca-audiencia": { ratio: "4/5", alt: "Personas frente a la máquina de cobro mientras pagan su boleto" },
  "maquina-cobro": { ratio: "4/5", alt: "Máquina de cobro de estacionamiento con la pantalla cobten instalada" },
  "detalle-hardware": { ratio: "16/9", alt: "Detalle de la pantalla montada en la máquina de cobro y su conexión" },
  "ciudad-noche": { ratio: "21/9", alt: "Ciudad de México de noche vista desde un estacionamiento" },
} as const;

export type LandingImage = keyof typeof LANDING_IMAGES;
