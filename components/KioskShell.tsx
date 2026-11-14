"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CodiPanel } from "@/components/CodiPanel";
import { DoohPlayer } from "@/components/DoohPlayer";
import { resolveProfile, type KioskProfileId } from "@/lib/kiosk-profile";

/**
 * Profiles (later replaced by portal pairing):
 *   /?profile=bathroom
 *   /?profile=parking
 *   /?profile=laundry
 *
 * Dynamic demo only (machine signal stub):
 *   /?profile=parking&session=1  → shows active CoDi checkout
 * In production, session=1 comes from relay/API bridge — never a visible button.
 */
export function KioskShell() {
  const searchParams = useSearchParams();
  const profile = useMemo(
    () => resolveProfile(searchParams.get("profile")),
    [searchParams],
  );
  const sessionFromSignal = searchParams.get("session") === "1";

  const [sessionActive, setSessionActive] = useState(
    profile.billingMode === "fixed" || sessionFromSignal,
  );

  useEffect(() => {
    setSessionActive(profile.billingMode === "fixed" || sessionFromSignal);
  }, [profile.id, profile.billingMode, sessionFromSignal]);

  return (
    <div
      className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-zinc-100"
      style={{ colorScheme: "light" }}
    >
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[7fr_3fr]">
        <DoohPlayer
          billingMode={profile.billingMode}
          sessionActive={sessionActive}
        />
        <CodiPanel
          profile={profile}
          sessionActive={sessionActive}
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
    <div className="pointer-events-none fixed bottom-3 left-3 z-50 flex gap-2 opacity-30 transition hover:opacity-100">
      {(
        [
          ["bathroom", "Baño"],
          ["parking", "Parking"],
          ["laundry", "Lavandería"],
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
