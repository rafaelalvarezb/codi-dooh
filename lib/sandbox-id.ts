/** Ids of "Probar como anunciante" sandboxes. Dependency-free (used by data and UI code). */
export const SANDBOX_PREFIX = "org_sbx";

export function isSandboxOrgId(orgId: string | null | undefined): boolean {
  return Boolean(orgId?.startsWith(`${SANDBOX_PREFIX}_`));
}
