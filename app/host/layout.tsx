import { Suspense } from "react";
import { AppShell, AppShellFallback } from "@/components/app/AppShell";

export default function Layout({ children }: LayoutProps<"/host">) {
  return (
    <div className="app-mode">
      <Suspense fallback={<AppShellFallback />}>
        <AppShell area="host">{children}</AppShell>
      </Suspense>
    </div>
  );
}
