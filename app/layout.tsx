import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "cobten",
  description: "Cobros CoDi y publicidad en pantalla para estacionamientos.",
  applicationName: "cobten",
  // "Agregar a inicio" on an iPad opens the kiosk full screen, without Safari's bars.
  appleWebApp: { capable: true, title: "cobten", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F7F8FA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="h-full bg-[var(--cd-surface)] text-[var(--cd-ink)]"
        style={{ colorScheme: "light" }}
      >
        {children}
      </body>
    </html>
  );
}
