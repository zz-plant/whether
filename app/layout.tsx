import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GlobalHeader } from "./components/globalHeader";
import { STORAGE_KEYS } from "../lib/storage/keys";
import { navigationLayers, utilityLinks } from "../lib/navigation/informationArchitecture";
import { GlobalCommandPalette } from "./components/globalCommandPalette";
import { GlobalTimeMachine } from "./components/globalTimeMachine";
import { GlobalShareRail } from "./components/globalShareRail";
import { MobileTabBar } from "./components/MobileTabBar";
import { ScrollProgressBar } from "./components/scrollProgressBar";
import { ScreenshotDetector } from "./components/ScreenshotDetector";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastProviderRoot } from "./components/toastProviderRoot";
import { PremiumFunnelTracker } from "./components/premiumFunnelTracker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "../lib/siteUrl";
import { buildSocialImageUrl, canonicalPositioningLine, defaultSiteDescription, websiteName } from "../lib/seo";
import { publisherAuthor, publisherProfilePath } from "../lib/publisher";

const BRIEF_MD_URL = `${siteUrl}/brief.md`;
const AGENT_API_URL = `${siteUrl}/api/agent?cadence=weekly`;
const LLMS_TXT_URL = `${siteUrl}/llms.txt`;
const WELL_KNOWN_MANIFEST_URL = `${siteUrl}/.well-known/whether-agent.json`;

const siteName = websiteName;
const siteDescription = defaultSiteDescription;
const socialImageUrl = buildSocialImageUrl();
const themeStorageKey = STORAGE_KEYS.theme;
const orientationDismissKey = STORAGE_KEYS.homeOrientationDismissed;

export const buildThemeBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const theme = window.localStorage.getItem(${JSON.stringify(themeStorageKey)});
    const nextTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
  } catch {
    // Ignore bootstrap errors and let the server-rendered shell remain usable.
  }
})();
`;

/**
 * Hides the first-run orientation card before hydration when the visitor has
 * already dismissed it, so it does not flash back in on every navigation.
 *
 * This script used to bootstrap a display mode too, writing `data-display-mode`
 * and `data-display-preference` onto the root element. No stylesheet ever read
 * either attribute, so the TV/kiosk mode that four other modules existed to
 * serve never changed a pixel; the whole subsystem was deleted on 2026-09-07.
 * The orientation half is the part that always worked — it injects the rule
 * that consumes its own attribute, three lines below where it sets it.
 */
export const buildOrientationBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const dismissed = window.localStorage.getItem(${JSON.stringify(orientationDismissKey)}) === "1";

    root.dataset.homeOrientationDismissed = dismissed ? "true" : "false";

    if (!document.head.querySelector('style[data-weather-ui-bootstrap="orientation"]')) {
      const style = document.createElement("style");
      style.setAttribute("data-weather-ui-bootstrap", "orientation");
      style.textContent = 'html[data-home-orientation-dismissed="true"] [data-weather-first-run-orientation="true"]{display:none !important;}';
      document.head.appendChild(style);
    }
  } catch {
    // Ignore bootstrap errors; the orientation card falls back to rendering.
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
  authors: [{ name: publisherAuthor.name, url: `${siteUrl}${publisherProfilePath}` }],
  creator: publisherAuthor.name,
  publisher: "Whether",
  /*
   * No `alternates.canonical` here, deliberately.
   *
   * Next merges metadata down the segment tree, so a canonical set on the root
   * layout is inherited by every page that does not set its own — and it pointed
   * at "/". Four pages in the sitemap never overrode it (`/comps`, `/history`,
   * `/share`, `/api-docs`), so each one submitted itself for indexing while its
   * markup named the homepage as the canonical version. That is the standard
   * recipe for a URL being crawled and then dropped.
   *
   * A page with no canonical tag self-canonicalises, which is the safe default;
   * a page with the wrong one does not. Set `alternates.canonical` per page —
   * `buildPageMetadata` does it for you — and leave this absent so a new route
   * that forgets fails safe instead of pointing at "/".
   */
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
    <html lang="en" suppressHydrationWarning className="font-sans">
      <head>
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0284c7" />
        {/* Fonts are self-hosted from public/fonts (see app/styles/fonts.css),
            so there is no fonts.googleapis.com stylesheet in the critical path
            and no preconnect to a third-party host. Only the two faces that
            render above the fold are preloaded. Fraunces 600, not 700: the hero
            headline is font-semibold, so 700 is never requested on first paint
            and preloading it just burned a round-trip. The remaining weights
            load from the same origin when the stylesheet asks for them. */}
        <link rel="preload" href="/fonts/fraunces-600.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/ibm-plex-sans-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fred.stlouisfed.org" />
        <link rel="dns-prefetch" href="https://query1.finance.yahoo.com" />
        <link rel="prefetch" href="/operate" />
        <link rel="prefetch" href="/signals" />
        {/* No `hrefLang="x-default"` here. It lived in the layout, so every page
            declared the homepage as its x-default target — the same inherited-
            pointer problem as the canonical above. x-default names the fallback
            among a set of language or region alternates, and this site publishes
            one locale and no alternates, so the correct number of these links is
            zero rather than one per page. */}
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
          id="whether-orientation-bootstrap"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: buildOrientationBootstrapScript() }}
        />
      </head>
      <body className="flex min-h-screen flex-col pb-[calc(3.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <TooltipProvider>
        <ScrollProgressBar />
        <ToastProviderRoot>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <GlobalHeader />
          <GlobalCommandPalette />
          <GlobalTimeMachine />
          <GlobalShareRail />
          <MobileTabBar />
          <ScreenshotDetector />
          <PremiumFunnelTracker />
          {children}
        </ToastProviderRoot>
        <footer className="border-t border-slate-800/60 bg-[var(--bg-body)] px-4 py-10">
          <div className="mx-auto max-w-5xl">
            {/* Brand first. The footer opened straight into three centred rows of
                anonymous links: no wordmark, no statement of what the product is,
                on the second-most-common surface a reader checks for exactly
                that. The line is `canonicalPositioningLine`, so it cannot drift
                from the one the metadata already ships. */}
            <div className="grid gap-8 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-12">
              <div className="space-y-2">
                <p className="text-sm font-semibold tracking-[0.08em] text-white">Whether</p>
                <p className="max-w-[32ch] text-fluid-micro leading-relaxed text-[var(--footer-legal)]">
                  {canonicalPositioningLine}
                </p>
              </div>

              {/* Two labelled columns rather than two centred rows. Centring gave
                  the five surfaces the product is about the same rank and the same
                  scan path as Embed and RSS; a heading per group says which is
                  which before the reader has read a single link. */}
              <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
                <nav aria-labelledby="footer-product-heading" className="space-y-1">
                  <p id="footer-product-heading" className="type-eyebrow text-slate-400">The weekly loop</p>
                  {/* Wraps horizontally on mobile, stacks on `sm`. A vertical list
                      gives every link its own 44px row, which on a phone turned a
                      ~400px footer into a ~1000px one; the labelled groups are the
                      part worth keeping, not the column shape at every width. */}
                  <ul className="flex flex-wrap gap-x-5 sm:block">
                    {navigationLayers.map((layer) => (
                      <li key={layer.href} className="break-inside-avoid">
                        <Link
                          href={layer.href}
                          className="inline-flex min-h-[44px] items-center text-fluid-sm text-[var(--footer-link)] no-underline transition-colors hover:text-[var(--footer-link-hover)]"
                        >
                          {layer.navLabel ?? layer.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Derived from utilityLinks for the same reason the column beside
                    it is derived from navigationLayers: the hand-written copy that
                    used to live here drifted, and /pricing fell out of the footer
                    entirely. */}
                <nav aria-labelledby="footer-tools-heading" className="space-y-1">
                  <p id="footer-tools-heading" className="type-eyebrow text-slate-400">Tools &amp; reference</p>
                  {/* Same shape as the column beside it: wrapping row on mobile,
                      stacked list on `sm`, where twelve entries at the 44px touch
                      target still read as a scannable column rather than a tower. */}
                  <ul className="flex flex-wrap gap-x-4 sm:block sm:columns-2 sm:gap-x-5">
                    {utilityLinks.map((link) => (
                      <li key={link.href} className="break-inside-avoid">
                        <Link
                          href={link.href}
                          className="inline-flex min-h-[44px] items-center text-fluid-sm text-[var(--footer-legal)] no-underline transition-colors hover:text-[var(--footer-legal-hover)]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li className="break-inside-avoid">
                      {/* A file, not a page — stays an <a> and outside the link set. */}
                      <a
                        href="/feed.xml"
                        className="inline-flex min-h-[44px] items-center text-fluid-sm text-[var(--footer-legal)] no-underline transition-colors hover:text-[var(--footer-legal-hover)]"
                      >
                        RSS
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

            {/* No separators. They were `<span>·</span>` siblings — text nodes,
                and so wrap candidates like any other, which regularly stranded a
                dot at the end of a line; moving them to a CSS `::before` only
                moved the defect, since the item that lands first on a wrapped
                line still carries one. Spacing separates these six well enough,
                and spacing cannot wrap badly. */}
            <div className="mt-8 flex flex-col gap-3 border-t border-slate-800/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <nav
                aria-label="Legal and credits"
                className="flex flex-wrap items-center gap-x-6 gap-y-0 text-fluid-micro text-[var(--footer-legal)]"
              >
                <Link href="/acceptable-use-policy" className="inline-flex min-h-[44px] items-center no-underline transition-colors hover:text-[var(--footer-legal-hover)]">Acceptable Use</Link>
                <Link href="/terms-of-service" className="inline-flex min-h-[44px] items-center no-underline transition-colors hover:text-[var(--footer-legal-hover)]">Terms</Link>
                <a href="https://github.com/zz-plant/whether" className="inline-flex min-h-[44px] items-center no-underline transition-colors hover:text-[var(--footer-legal-hover)]" target="_blank" rel="noreferrer">GitHub</a>
                <span className="inline-flex min-h-[44px] items-center">
                  Built by
                  <a href="https://kanav.net" className="ml-1 no-underline transition-colors hover:text-[var(--footer-link-hover)]" target="_blank" rel="noreferrer">Kanav Jain</a>
                </span>
                <a href="https://nextconsensus.com" className="inline-flex min-h-[44px] items-center no-underline transition-colors hover:text-[var(--footer-link-hover)]" target="_blank" rel="noreferrer">Next Consensus</a>
                <span className="inline-flex min-h-[44px] items-center">© 2026 Whether</span>
              </nav>
              {/* Inside the footer now. It used to render after `</footer>`, so a
                  keyboard hint floated alone under the copyright, attached to
                  nothing. */}
              <KeyboardShortcuts />
            </div>
          </div>
        </footer>
        </TooltipProvider>
      </body>
    </html>
  );
}
