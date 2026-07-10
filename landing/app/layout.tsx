import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const TITLE =
  "Prospector - watch every conversation about your brand, from Slack";
const DESCRIPTION =
  "A brand-monitoring agent that lives in Slack. Track customers, competitors, complaints, and support questions across Reddit, LinkedIn, and X — each with a drafted response you can post back in one tap.";
const OG_DESCRIPTION =
  "Tell it what to watch. Prospector tracks Reddit, LinkedIn, and X for the mentions that matter, drafts a response for each, and posts back to the source in one tap.";
const SITE_URL = "https://prospector.withsia.com";

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s · Prospector",
  },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: "Prospector",
  keywords: [
    "brand monitoring",
    "Slack agent",
    "social listening",
    "Reddit monitoring",
    "LinkedIn monitoring",
    "X monitoring",
    "Twitter monitoring",
    "lead generation",
    "AI agent",
    "customer support",
  ],
  authors: [{ name: "Sia" }],
  creator: "Sia",
  publisher: "Sia",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Prospector — brand monitoring that lives in Slack",
    description: OG_DESCRIPTION,
    url: SITE_URL,
    siteName: "Prospector",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prospector — brand monitoring that lives in Slack",
    description: OG_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#BB7558",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
