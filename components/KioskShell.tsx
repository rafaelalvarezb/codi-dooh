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
 *   /?profile=bathroom&demo=1  (shows profile switcher)
 *   /?profile=parking&screen=<id>&token=<secret>  (linked screen, live ads)
 *   …&frame=0  (full screen: no decorative bezel, e.g. on an iPad)
 *
 * Layout SPEC: minmax(0,1fr) 420px — DOOH full-bleed left, CoDi panel right.
 */
/** Below this height the decorative bezel would squeeze the CoDi panel. */
const MIN_FRAMED_HEIGHT = 780;

/**
 * Full-bleed on real devices that already have a bezel: when asked
 * (?frame=0), when opened from the iOS home screen, or when the screen is too
 * short for the framed layout (older iPads, Safari with its toolbar).
 */
function useFullBleed(requested: boolean): boolean {
  const [full, setFull] = useState(requested);
  useEffect(() => {
    const check = () => {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setFull(requested || iosStandalone || window.innerHeight < MIN_FRAMED_HEIGHT);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [requested]);
  return full;
}

export function KioskShell() {
  const searchParams = useSearchParams();
  const profile = useMemo(
    () => resolveProfile(searchParams.get("profile")),
    [searchParams],
  );
  const sessionFromSignal = searchParams.get("session") === "1";
  // Linked screen (/?screen=<id>&token=<secret>): live playlist + proof of play.
  const rawScreen = searchParams.get("screen");
  const screenId = rawScreen && /^[a-z0-9_-]{1,64}$/i.test(rawScreen) ? rawScreen : null;
  const token = searchParams.get("token");
  const showDemoHints = searchParams.get("demo") === "1";
  const fullBleed = useFullBleed(searchParams.get("frame") === "0");

  const initialSession = profile.billingMode === "fixed" || sessionFromSignal;
  const sessionKey = `${profile.id}|${profile.billingMode}|${sessionFromSignal}`;
  const [sessionActive, setSessionActive] = useState(initialSession);
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);

  // Reset the session when the profile or ?session= changes (render-time sync).
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey);
    setSessionActive(initialSession);
  }

  return (
    <div
      className={
        fullBleed
          ? "flex h-dvh max-h-dvh w-full overflow-hidden bg-[var(--cd-night)]"
          : "flex h-dvh max-h-dvh w-full items-center justify-center overflow-hidden bg-[#E9E9EC] p-3 sm:p-6"
      }
      style={{ colorScheme: "light" }}
    >
      <div
        className={
          fullBleed
            ? "relative flex h-full w-full flex-col overflow-hidden bg-[var(--cd-night)]"
            : "relative flex h-full w-full max-h-[800px] max-w-[1280px] flex-col overflow-hidden rounded-[26px] bg-[var(--cd-night)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[40px] sm:p-4"
        }
      >
        <main
          className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_420px] ${fullBleed ? "" : "rounded-[26px]"}`}
        >
          <DoohPlayer
            billingMode={profile.billingMode}
            sessionActive={sessionActive}
            screenId={screenId}
            token={token}
          />
          <CodiPanel
            profile={profile}
            sessionActive={sessionActive}
            machineId={screenId ?? profile.id}
            onEndSession={
              profile.billingMode === "dynamic"
                ? () => setSessionActive(false)
                : undefined
            }
          />
        </main>

        {showDemoHints ? <DemoProfileHints active={profile.id} /> : null}
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
          href={`/?profile=${id}&demo=1`}
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
