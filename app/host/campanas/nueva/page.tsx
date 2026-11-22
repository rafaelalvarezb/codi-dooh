import type { Metadata } from "next";
import { NewCampaignView } from "@/components/campaigns/CampaignPages";

export const metadata: Metadata = { title: "Nueva campaña · CODI·DOOH" };

export default function Page() {
  return <NewCampaignView mode="house" />;
}
