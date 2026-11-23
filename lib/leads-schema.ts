/** "Agenda una demo" form: shared by the landing form (client) and /api/leads. */
import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Mexican phone: 10 digits, optionally prefixed with +52 / 52. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  return digits.length === 10 ? digits : null;
}

export const LeadSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80, "Nombre demasiado largo."),
  business: z
    .string()
    .trim()
    .min(2, "Escribe el nombre de tu negocio.")
    .max(120, "Nombre demasiado largo."),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const phone = normalizePhone(v);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Escribe un teléfono de 10 dígitos." });
        return z.NEVER;
      }
      return phone;
    }),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Revisa tu correo."),
  city: optionalText(80, "Ciudad demasiado larga."),
  spaces: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d]/g, ""));
      if (!Number.isInteger(n) || n < 1 || n > 100_000) {
        ctx.addIssue({ code: "custom", message: "Escribe cuántos cajones tienes." });
        return z.NEVER;
      }
      return n;
    }),
  message: optionalText(1000, "Máximo 1000 caracteres."),
  /** Honeypot: hidden from people, bots fill it. */
  website: z.string().optional(),
});

export type LeadInput = z.input<typeof LeadSchema>;
export type LeadData = z.output<typeof LeadSchema>;
