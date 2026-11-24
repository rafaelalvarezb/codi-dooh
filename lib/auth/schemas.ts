import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "./password-policy";

export const RegisterSchema = z.object({
  kind: z.enum(["advertiser", "host"]),
  orgName: z.string().trim().min(2, "Escribe el nombre de tu negocio.").max(80),
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  email: z.string().trim().toLowerCase().email("Revisa tu correo.").max(254),
  password: z
    .string()
    .min(PASSWORD_MIN, `Usa al menos ${PASSWORD_MIN} caracteres.`)
    .max(PASSWORD_MAX),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Revisa tu correo.").max(254),
  password: z.string().min(1, "Escribe tu contraseña.").max(PASSWORD_MAX),
});

export const SwitchOrgSchema = z.object({
  orgId: z.string().regex(/^org_[a-z0-9]{6,32}$/),
});

export const ForgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Revisa tu correo.").max(254),
});

export const ResetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z
    .string()
    .min(PASSWORD_MIN, `Usa al menos ${PASSWORD_MIN} caracteres.`)
    .max(PASSWORD_MAX),
});
