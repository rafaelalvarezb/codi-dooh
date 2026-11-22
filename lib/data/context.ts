/**
 * Every org-scoped query takes an OrgCtx built from the verified session
 * (see orgCtx in lib/auth/dal.ts). IDs coming from the client are only ever
 * used together with this orgId, never on their own.
 */
export type OrgCtx = { readonly orgId: string; readonly kind: "host" | "advertiser" | "both" };

export class NotFoundError extends Error {
  constructor(what = "Recurso") {
    super(`${what} no encontrado`);
  }
}

export class ValidationError extends Error {}
