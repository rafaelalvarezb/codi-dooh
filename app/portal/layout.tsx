import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal · CODI-DOOH",
  description: "Operación de máquinas CoDi y transacciones.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <div className="portal-mode min-h-dvh bg-[var(--cd-surface)] text-[var(--cd-ink)]">
      <style>{`body{overflow:auto;user-select:auto}`}</style>
      {children}
    </div>
  );
}
