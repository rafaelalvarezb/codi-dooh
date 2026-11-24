import QRCode from "qrcode";
import { HeroScroll } from "@/components/landing/HeroScroll";
import { ImageSlot } from "@/components/landing/ImageSlot";
import { Nav } from "@/components/landing/Nav";
import { HowItWorksScroll } from "@/components/landing/HowItWorksScroll";
import { RevealObserver } from "@/components/landing/RevealObserver";
import {
  Advertisers,
  Benefits,
  DemoCta,
  Faq,
  Footer,
  Hardware,
  HowItWorks,
  ScreenIncome,
  TickerBand,
} from "@/components/landing/Sections";

/** cobten.com (served at "/" on the marketing domain by proxy.ts). */
export default async function LandingPage() {
  // A real, scannable QR (it opens cobten.com), drawn like the kiosk's.
  const qrSvg = await QRCode.toString("https://cobten.com", {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0A0B", light: "#FFFFFF" },
  });

  return (
    <>
      <Nav />
      <main id="inicio">
        <HeroScroll
          qrSvg={qrSvg}
          background={
            <div className="absolute inset-0 opacity-30 [mask-image:linear-gradient(180deg,transparent,black_30%,black_70%,transparent)]">
              <ImageSlot name="estacionamiento-plaza" fill placeholder={false} priority sizes="100vw" />
            </div>
          }
        />
        <TickerBand />
        {/* For the driver */}
        <HowItWorks />
        {/* For parking lots */}
        <Benefits />
        <ScreenIncome />
        <Hardware />
        {/* For advertisers */}
        <Advertisers />
        <Faq />
        <DemoCta />
      </main>
      <Footer />
      <RevealObserver />
      <HowItWorksScroll />
    </>
  );
}
