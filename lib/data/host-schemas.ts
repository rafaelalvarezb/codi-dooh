/** zod schemas shared by host route handlers and forms. */
import { z } from "zod";
import { SCREEN_PROFILES, SITE_KINDS } from "@/lib/host-catalog";

const text = (max: number, msg: string) => z.string().trim().min(1, msg).max(max, `Máximo ${max} caracteres.`);

export const BusinessSchema = z.object({
  name: text(80, "Escribe el nombre de tu negocio."),
  legalName: text(160, "Escribe la razón social o tu nombre completo."),
});

export const ClabeSchema = z.object({
  clabe: z.string().trim().min(1, "Escribe tu CLABE.").max(40),
  holder: text(160, "Escribe el nombre del titular de la cuenta."),
});

export const OrgPatchSchema = z.union([
  z.object({ business: BusinessSchema }),
  z.object({ clabe: ClabeSchema }),
]);

export const SiteSchema = z.object({
  name: text(80, "Escribe un nombre para el sitio."),
  address: z.string().trim().max(200).default(""),
  kind: z.enum(SITE_KINDS, { message: "Elige el tipo de sitio." }),
});

export const ScreenSchema = z.object({
  siteId: z.string().regex(/^sit_[a-z0-9]{4,32}$/, "Elige un sitio."),
  name: text(80, "Escribe un nombre para la pantalla."),
  profile: z.enum(SCREEN_PROFILES).optional(),
  acceptsAds: z.boolean().optional(),
});

export const ScreenPatchSchema = z
  .object({
    name: text(80, "Escribe un nombre para la pantalla.").optional(),
    acceptsAds: z.boolean().optional(),
    dailyPayers: z
      .number({ message: "Escribe un número." })
      .int("Escribe un número entero.")
      .min(1, "Escribe cuántas personas pagan al día.")
      .max(100_000, "Revisa el número.")
      .nullable()
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.acceptsAds !== undefined || v.dailyPayers !== undefined, "Nada que cambiar.");

export const SCREEN_ID = /^scr_[a-z0-9_]{4,40}$/;
