import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { GlobalHeader } from "./components/globalHeader";
import { siteUrl } from "../lib/siteUrl";
import { buildSocialImageUrl } from "../lib/seo";

const weatherSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-weather-sans",
  display: "swap",
});

const weatherDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-weather-display",
  display: "swap",
});

const siteName = "Whether — Capital Posture Governance Standard";
const siteDescription =
  "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";
const socialImageUrl = buildSocialImageUrl();
const themeStorageKey = "whether-theme";
const displayModeStorageKey = "whether-display-mode";
const orientationDismissKey = "whether.home.orientation.dismissed";

export const buildPersistedUiBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const storage = window.localStorage;
    const theme = storage.getItem(${JSON.stringify(themeStorageKey)});
    const nextTheme = theme === "light" ? "light" : "dark";
    const displayModeParam = new URL(window.location.href).searchParams.get("display");
    const persistedDisplayMode = storage.getItem(${JSON.stringify(displayModeStorageKey)});
    const requestedDisplayMode = displayModeParam === "tv" || displayModeParam === "auto"
      ? displayModeParam
      : persistedDisplayMode === "tv" || persistedDisplayMode === "auto"
        ? persistedDisplayMode
        : "auto";
    const coarsePointer = window.matchMedia("(min-width: 1280px) and (pointer: coarse)").matches || window.matchMedia("(min-width: 1920px)").matches;
    const nextDisplayMode = requestedDisplayMode === "auto" && coarsePointer ? "tv" : requestedDisplayMode;
    const dismissed = storage.getItem(${JSON.stringify(orientationDismissKey)}) === "1";

    root.dataset.theme = nextTheme;
    root.dataset.displayMode = nextDisplayMode;
    root.dataset.displayPreference = requestedDisplayMode;
    root.dataset.homeOrientationDismissed = dismissed ? "true" : "false";
    root.style.colorScheme = nextTheme;

    if (!document.head.querySelector('style[data-weather-ui-bootstrap="orientation"]')) {
      const style = document.createElement("style");
      style.setAttribute("data-weather-ui-bootstrap", "orientation");
      style.textContent = 'html[data-home-orientation-dismissed="true"] [data-weather-first-run-orientation="true"]{display:none !important;}';
      document.head.appendChild(style);
    }
  } catch {
    // Ignore bootstrap errors and let the server-rendered shell remain usable.
  }
})();
`;

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
  applicationName: "Whether Capital Posture Governance Standard",
  keywords: [
    "macroeconomic signals",
    "Treasury yield curve",
    "product strategy",
    "engineering strategy",
    "capital markets",
    "capital posture classification",
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
        alt: "Whether capital posture social preview",
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#f7fbff" },
  ],
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${weatherSans.variable} ${weatherDisplay.variable}`} suppressHydrationWarning>
      <head>
        <Script id="whether-persisted-ui-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: buildPersistedUiBootstrapScript() }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <GlobalHeader />
        {children}
      </body>
    </html>
  );
}
