import { Suspense } from "react";
import { AppShell, AppShellFallback } from "@/components/app/AppShell";

export default function Layout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="app-mode">
      <Suspense fallback={<AppShellFallback />}>
        <AppShell area="admin">{children}</AppShell>
      </Suspense>
    </div>
  );
}
