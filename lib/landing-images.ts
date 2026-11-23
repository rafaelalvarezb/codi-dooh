/**
 * Image slots on cobten.com. Drop `public/landing/<name>.webp` (or .jpg/.png)
 * and the slot shows it on the next deploy; until then a placeholder shows
 * the expected file name. Prompts for each: docs/landing-imagenes.md.
 */
export const LANDING_IMAGES = {
  "salida-estacionamiento": { ratio: "16/9", alt: "Salida de un estacionamiento de noche con la pluma cerrada" },
  "paso-escanea": { ratio: "4/5", alt: "Conductora escanea el QR del kiosco desde su auto" },
  "paso-confirma": { ratio: "4/5", alt: "Mano confirmando un pago en la app del banco" },
  "paso-sal": { ratio: "4/5", alt: "La pluma se levanta y el auto sale del estacionamiento" },
  "kiosco-anuncio": { ratio: "16/9", alt: "Kiosco cobten mostrando un anuncio en la caseta de salida" },
  "marca-audiencia": { ratio: "4/5", alt: "Personas frente a la pantalla del kiosco mientras pagan" },
  "kiosco-instalado": { ratio: "4/5", alt: "Kiosco cobten instalado en un poste junto a la pluma" },
  "detalle-hardware": { ratio: "16/9", alt: "Detalle de la tableta y el relevador que abre la pluma" },
  "ciudad-noche": { ratio: "21/9", alt: "Ciudad de México de noche vista desde un estacionamiento" },
} as const;

export type LandingImage = keyof typeof LANDING_IMAGES;
