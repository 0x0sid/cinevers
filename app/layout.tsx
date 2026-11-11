import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Instrument_Serif } from "next/font/google";
import { HERO, SITE_URL, TAGLINE } from "@/components/site/data";
import "./globals.css";

const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Cinevers: step into your own movie", template: "%s · Cinevers" },
  description: TAGLINE,
  applicationName: "Cinevers",
  icons: { icon: "data:," },
  openGraph: { type: "website", siteName: "Cinevers", title: "Cinevers: step into your own movie", description: TAGLINE, images: [{ url: HERO.poster, width: 1920, height: 1080 }] },
  twitter: { card: "summary_large_image", title: "Cinevers: step into your own movie", description: TAGLINE, images: [HERO.poster] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark", themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${serif.variable}`}>
      <body className="bg-ink font-sans text-white antialiased">{children}</body>
    </html>
  );
}
