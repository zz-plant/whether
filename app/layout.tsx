import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProviderRoot } from "./components/toastProviderRoot";
import { GlobalHeader } from "./components/globalHeader";
import { siteUrl } from "../lib/siteUrl";
import { buildSocialImageUrl } from "../lib/seo";

const siteName = "Whether — Market Climate Station";
const siteDescription =
  "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";
const socialImageUrl = buildSocialImageUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  title: {
    default: siteName,
    template: "%s | Whether"
  },
  description: siteDescription,
  applicationName: "Whether Market Climate Station",
  keywords: [
    "macroeconomic signals",
    "Treasury yield curve",
    "product strategy",
    "engineering strategy",
    "capital markets",
    "market climate classification",
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
    siteName,
    images: [
      {
        url: socialImageUrl,
        width: 1200,
        height: 630,
        alt: "Whether market climate social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: [socialImageUrl],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ToastProviderRoot>
          <GlobalHeader />
          {children}
        </ToastProviderRoot>
      </body>
    </html>
  );
}
