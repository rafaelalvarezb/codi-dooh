"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CodiPanel } from "@/components/CodiPanel";
import { DoohPlayer } from "@/components/DoohPlayer";
import { resolveProfile, type KioskProfileId } from "@/lib/kiosk-profile";

/**
 * Profiles:
 *   /?profile=bathroom
 *   /?profile=parking
 *   /?profile=laundry
 *   /?profile=parking&session=1
 *
 * On desktop, the shell is framed like a ~10" landscape tablet (16:10)
 * so DOOH creatives preview closer to the real device.
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
      className="flex h-dvh max-h-dvh w-full items-center justify-center overflow-hidden bg-zinc-300 p-3 sm:p-6"
      style={{ colorScheme: "light" }}
    >
      <div className="relative flex h-full w-full max-h-[720px] max-w-[1152px] flex-col overflow-hidden rounded-[28px] border border-zinc-400/40 bg-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[7fr_3fr]">
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
    </div>
  );
}

function DemoProfileHints({ active }: { active: KioskProfileId }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-50 flex gap-2 opacity-40 transition hover:opacity-100">
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
              : "border-white/25 bg-black/55 text-white",
          ].join(" ")}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
