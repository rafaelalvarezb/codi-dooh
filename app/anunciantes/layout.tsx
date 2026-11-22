import { Suspense } from "react";
import { AppShell, AppShellFallback } from "@/components/app/AppShell";

export default function Layout({ children }: LayoutProps<"/anunciantes">) {
  return (
    <div className="app-mode">
      <Suspense fallback={<AppShellFallback />}>
        <AppShell area="advertiser">{children}</AppShell>
      </Suspense>
    </div>
  );
}
