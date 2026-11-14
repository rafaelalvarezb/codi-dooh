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
  title: "CODI · DOOH",
  description:
    "Kiosco CoDi + DOOH: cobros claros con transferencia QR y publicidad programática.",
  applicationName: "CODI-DOOH",
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
      <body className="h-full overflow-hidden bg-[var(--cd-bg)] text-[var(--cd-text)]">
        {children}
      </body>
    </html>
  );
}
