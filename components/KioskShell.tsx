"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CodiPanel } from "@/components/CodiPanel";
import { DoohPlayer } from "@/components/DoohPlayer";
import { resolveProfile, type KioskProfileId } from "@/lib/kiosk-profile";

/**
 * Demo profiles via URL (hidden from end customers later via portal pairing):
 *   /?profile=bathroom  → cobro fijo siempre activo
 *   /?profile=parking   → espera boleto, luego cobro
 *   /?profile=laundry   → espera monto, luego cobro
 */
export function KioskShell() {
  const searchParams = useSearchParams();
  const profile = useMemo(
    () => resolveProfile(searchParams.get("profile")),
    [searchParams],
  );

  const [sessionActive, setSessionActive] = useState(
    profile.billingMode === "fixed",
  );

  useEffect(() => {
    setSessionActive(profile.billingMode === "fixed");
  }, [profile.id, profile.billingMode]);

  const dimAds = profile.billingMode === "fixed" || sessionActive;

  return (
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[var(--cd-bg)] text-[var(--cd-text)]">
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[7fr_3fr]">
        <DoohPlayer useCaseId={profile.useCaseId} dimmed={dimAds} />
        <CodiPanel
          profile={profile}
          sessionActive={sessionActive}
          onStartSession={
            profile.billingMode === "dynamic"
              ? () => setSessionActive(true)
              : undefined
          }
          onEndSession={
            profile.billingMode === "dynamic"
              ? () => setSessionActive(false)
              : undefined
          }
        />
      </main>

      <DemoProfileHints active={profile.id} />
    </div>
  );
}

function DemoProfileHints({ active }: { active: KioskProfileId }) {
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-50 flex gap-2 opacity-35 transition hover:opacity-100">
      {(
        [
          ["parking", "Parking"],
          ["laundry", "Lavandería"],
          ["bathroom", "Baño"],
        ] as const
      ).map(([id, label]) => (
        <a
          key={id}
          href={`/?profile=${id}`}
          className={[
            "pointer-events-auto rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur",
            active === id
              ? "border-black/20 bg-white text-black"
              : "border-white/25 bg-black/45 text-white",
          ].join(" ")}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
