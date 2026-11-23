import type { Metadata, Viewport } from "next";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cobten.com"),
  title: {
    default: "cobten · Cobro CoDi para estacionamientos",
    template: "%s · cobten",
  },
  description:
    "Un kiosco con QR CoDi en la salida de tu estacionamiento: tus clientes pagan con la app de su banco, la pluma se abre sola y tu pantalla gana con anuncios.",
  applicationName: "cobten",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://cobten.com",
    siteName: "cobten",
    title: "cobten · Pagan con su banco. Salen en segundos.",
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
