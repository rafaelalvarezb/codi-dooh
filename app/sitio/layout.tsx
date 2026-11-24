import type { Metadata, Viewport } from "next";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cobten.com"),
  title: {
    default: "cobten · Pagas con tu banco. Sales en segundos.",
    template: "%s · cobten",
  },
  description:
    "¿No traes efectivo? Paga tu estacionamiento con CoDi desde la app de tu banco, sin comisiones. Para estacionamientos: una pantalla en tu máquina de cobro que también gana con anuncios.",
  applicationName: "cobten",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://cobten.com",
    siteName: "cobten",
    title: "cobten · Pagas con tu banco. Sales en segundos.",
    description: "Cobro CoDi y publicidad en pantalla para estacionamientos.",
  },
  twitter: { card: "summary_large_image" },
};

/** The kiosk root layout blocks zoom; the public site must allow it. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#08080a",
};

export default function SiteLayout({ children }: LayoutProps<"/sitio">) {
  return <div className="cb-site min-h-dvh">{children}</div>;
}
