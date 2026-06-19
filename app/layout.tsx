import "./globals.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Fraunces } from "next/font/google";
import { GlobalHeader } from "./components/globalHeader";
import { ScrollProgressBar } from "./components/scrollProgressBar";
import { ScreenshotDetector } from "./components/ScreenshotDetector";
import { ThemeCycler } from "./components/ThemeCycler";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastProviderRoot } from "./components/toastProviderRoot";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "../lib/siteUrl";
import { buildSocialImageUrl, defaultSiteDescription, websiteName } from "../lib/seo";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-google",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-google",
  display: "swap",
});

const BRIEF_MD_URL = `${siteUrl}/brief.md`;
const AGENT_API_URL = `${siteUrl}/api/agent?cadence=weekly`;
const LLMS_TXT_URL = `${siteUrl}/llms.txt`;
const WELL_KNOWN_MANIFEST_URL = `${siteUrl}/.well-known/whether-agent.json`;

const siteName = websiteName;
const siteDescription = defaultSiteDescription;
const socialImageUrl = buildSocialImageUrl();
const themeStorageKey = "whether-theme";
const displayModeStorageKey = "whether-display-mode";
const orientationDismissKey = "whether.home.orientation.dismissed";

export const buildThemeBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const theme = window.localStorage.getItem(${JSON.stringify(themeStorageKey)});
    const nextTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;

    const variant = window.localStorage.getItem("whether-theme-variant");
    if (variant) {
      root.dataset.themeVariant = variant;
      root.style.colorScheme = ["paper", "minimal"].includes(variant) ? "light" : "dark";
    }
  } catch {
    // Ignore bootstrap errors and let the server-rendered shell remain usable.
  }
})();
`;

export const buildDisplayBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const storage = window.localStorage;
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

    root.dataset.displayMode = nextDisplayMode;
    root.dataset.displayPreference = requestedDisplayMode;
    root.dataset.homeOrientationDismissed = dismissed ? "true" : "false";

    if (!document.head.querySelector('style[data-weather-ui-bootstrap="orientation"]')) {
      const style = document.createElement("style");
      style.setAttribute("data-weather-ui-bootstrap", "orientation");
      style.textContent = 'html[data-home-orientation-dismissed="true"] [data-weather-first-run-orientation="true"]{display:none !important;}';
      document.head.appendChild(style);
    }
  } catch {
    // Ignore display bootstrap errors; orientation styling can fallback.
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
    ],
  },
  title: {
    default: siteName,
    template: "%s | Whether"
  },
  description: siteDescription,
  applicationName: "Whether",
  keywords: [
    "US market signals",
    "Treasury yield curve",
    "product strategy",
    "engineering strategy",
    "capital markets",
    "weekly market call",
    "operating guardrails"
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
        alt: "Whether weekly operating brief social preview",
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
    <html lang="en" suppressHydrationWarning className={`${ibmPlexSans.variable} ${fraunces.variable} font-sans`}>
      <head>
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0284c7" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&display=swap" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
        <link rel="dns-prefetch" href="https://fred.stlouisfed.org" />
        <link rel="dns-prefetch" href="https://query1.finance.yahoo.com" />
        <link rel="prefetch" href="/planning" />
        <link rel="prefetch" href="/evidence" />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />
        {/* Agent discovery: machine-readable alternates for browser-based AI agents */}
        <link rel="alternate" type="text/markdown" href={BRIEF_MD_URL} title="Whether Weekly Brief (Markdown)" />
        <link rel="alternate" type="application/json" href={AGENT_API_URL} title="Whether Weekly Brief (JSON)" />
        <link rel="alternate" type="text/plain" href={LLMS_TXT_URL} title="Whether for LLMs" />
        <link rel="llm" href={LLMS_TXT_URL} />
        <link rel="mcp-manifest" type="application/json" href={WELL_KNOWN_MANIFEST_URL} />
        <script
          id="whether-theme-bootstrap"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }}
        />
        <script
          id="whether-display-bootstrap"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: buildDisplayBootstrapScript() }}
          async
        />
      </head>
      <body>
        <TooltipProvider>
        <ScrollProgressBar />
        <ToastProviderRoot>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <GlobalHeader />
          <ScreenshotDetector />
          {children}
        </ToastProviderRoot>
        <footer className="border-t border-slate-800/60 bg-[var(--bg-body)] px-4 py-8">
          <div className="mx-auto max-w-4xl space-y-4">
            <nav aria-label="Product" className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-fluid-sm text-[var(--footer-link)]">
              <a href="/about" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">About</a>
              <a href="/threshold" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">Framework</a>
              <a href="/template" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">Template</a>
              <a href="/planning" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">Resources</a>
              <a href="/search" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">Search</a>
              <a href="/api-docs" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">API</a>
              <a href="/feed.xml" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline">RSS</a>
            </nav>
            <nav aria-label="Legal and credits" className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-fluid-micro text-[var(--footer-legal)]">
              <a href="/acceptable-use-policy" className="hover:text-[var(--footer-legal-hover)] transition-colors no-underline">Acceptable Use</a>
              <a href="/terms-of-service" className="hover:text-[var(--footer-legal-hover)] transition-colors no-underline">Terms</a>
              <span aria-hidden="true">·</span>
              <span>Built by <a href="https://kanav.net" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline" target="_blank" rel="noreferrer">Kanav Jain</a></span>
              <span aria-hidden="true">·</span>
              <a href="https://nextconsensus.com" className="hover:text-[var(--footer-link-hover)] transition-colors no-underline" target="_blank" rel="noreferrer">Next Consensus</a>
              <span aria-hidden="true">·</span>
              <span>© 2026 Whether</span>
            </nav>
          </div>
        </footer>
        <KeyboardShortcuts />
        <ThemeCycler />
        </TooltipProvider>
      </body>
    </html>
  );
}
