"use client";

import { useRouter } from "next/navigation";

export function PortalLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.replace("/portal/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="rounded-xl border border-[var(--cd-line)] bg-white px-3 py-2 text-[13px] font-medium text-[var(--cd-ink-2)]"
    >
      Salir
    </button>
  );
}
