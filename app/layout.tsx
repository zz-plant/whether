import "./globals.css";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";
const siteName = "Whether — Regime Station";
const siteDescription =
  "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s | Whether"
  },
  description: siteDescription,
  applicationName: "Whether Regime Station",
  keywords: [
    "macroeconomic signals",
    "Treasury yield curve",
    "product strategy",
    "engineering strategy",
    "capital markets",
    "regime classification",
    "operational constraints"
  ],
  authors: [{ name: "Whether" }],
  creator: "Whether",
  publisher: "Whether",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteName,
    description: siteDescription,
    siteName
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
