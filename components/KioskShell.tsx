"use client";

import { useState } from "react";
import { CodiTerminal } from "@/components/CodiTerminal";
import { DoohPlayer } from "@/components/DoohPlayer";
import { Navbar } from "@/components/Navbar";
import { getUseCase } from "@/lib/use-cases";
import type { UseCaseId } from "@/lib/types";

export function KioskShell() {
  const [useCaseId, setUseCaseId] = useState<UseCaseId>("parking");
  const [locked, setLocked] = useState(false);
  const useCase = getUseCase(useCaseId);

  return (
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-zinc-950 text-zinc-50">
      <Navbar
        useCaseId={useCaseId}
        onUseCaseChange={setUseCaseId}
        locked={locked}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[7fr_3fr]">
        <DoohPlayer useCase={useCase} />
        <CodiTerminal useCase={useCase} onBusyChange={setLocked} />
      </main>
    </div>
  );
}
