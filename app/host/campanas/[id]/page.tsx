import type { Metadata } from "next";
import { CampaignDetailView } from "@/components/campaigns/CampaignPages";

export const metadata: Metadata = { title: "Campaña · cobten" };

export default async function Page({ params, searchParams }: PageProps<"/host/campanas/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <CampaignDetailView mode="house" id={id} justPublished={sp.publicada === "1"} />;
}
