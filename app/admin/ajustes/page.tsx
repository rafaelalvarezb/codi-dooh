import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/app/Page";
import { SettingsForm } from "@/components/admin/AdminActions";
import { requireViewer } from "@/lib/auth/dal";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Ajustes · Admin · cobten", robots: { index: false } };

export default async function Page() {
  await requireViewer("admin", "/admin/ajustes");
  const s = await getSettings();
  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Admin" title="Ajustes" description="Precio de los anuncios y reparto con los hosts." />
      <Card className="mt-8 px-5 py-6 sm:px-7">
        <SettingsForm
          defaults={{
            spotPriceMxn: Math.round(s.defaultSpotPriceCents / 100),
            commissionPct: s.commissionBps / 100,
            payoutDay: s.payoutDay,
          }}
        />
      </Card>
    </main>
  );
}
