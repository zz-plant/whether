import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GlobalHeader } from "./components/globalHeader";
import { RecordBand } from "./components/recordBand";
import { STORAGE_KEYS } from "../lib/storage/keys";
import { navigationGroups, pagesInGroup, utilityLinks } from "../lib/navigation/informationArchitecture";
import { GlobalCommandPalette } from "./components/globalCommandPalette";
import { GlobalTimeMachine } from "./components/globalTimeMachine";
import { GlobalShareRail } from "./components/globalShareRail";
import { MobileTabBar } from "./components/MobileTabBar";
import { DeadClickBeacon } from "./components/deadClickBeacon";
import { RunningHead } from "./components/runningHead";
import { ScrollProgressBar } from "./components/scrollProgressBar";
import { ScreenshotDetector } from "./components/ScreenshotDetector";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ServiceWorkerRegistrar } from "./components/serviceWorkerRegistrar";
import { ToastProviderRoot } from "./components/toastProviderRoot";
import { TooltipProvider } from "./components/ui/tooltip";
import { siteUrl } from "../lib/siteUrl";
import { WHETHER_AGENT_MANIFEST_PATH } from "../lib/agent/discovery";
import { CALENDAR_FEED_PATH } from "../lib/export/calendarFeed";
import { buildSocialImageUrl, canonicalPositioningLine, defaultSiteDescription, websiteName } from "../lib/seo";
import { publisherAuthor, publisherProfilePath } from "../lib/publisher";
import { activationLastWeekStorageKey } from "../lib/activationFunnel";
import { WebMcpBridge } from "./components/webMcpBridge";

const BRIEF_MD_URL = `${siteUrl}/brief.md`;
const AGENT_API_URL = `${siteUrl}/api/agent?cadence=weekly`;
const LLMS_TXT_URL = `${siteUrl}/llms.txt`;
const WELL_KNOWN_MANIFEST_URL = `${siteUrl}${WHETHER_AGENT_MANIFEST_PATH}`;
const FEED_URL = `${siteUrl}/feed.xml`;
const CALENDAR_WEBCAL_URL = `${siteUrl}${CALENDAR_FEED_PATH}`.replace(/^https?:/, "webcal:");

const siteName = websiteName;
const siteDescription = defaultSiteDescription;
const socialImageUrl = buildSocialImageUrl();
const themeStorageKey = STORAGE_KEYS.theme;
const orientationDismissKey = STORAGE_KEYS.homeOrientationDismissed;

const buildThemeBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const stored = window.localStorage.getItem(${JSON.stringify(themeStorageKey)});
    // A stored choice wins. Without one the device setting picks, and light is the
    // answer when it states no preference (docs/design/rebuild-covenant.md).
    const nextTheme = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
const buildOrientationBootstrapScript = () => `
(() => {
  try {
    const root = document.documentElement;
    const dismissed = window.localStorage.getItem(${JSON.stringify(orientationDismissKey)}) === "1";

    root.dataset.homeOrientationDismissed = dismissed ? "true" : "false";
    // Whether this browser has rendered the brief before (ActivationTracker stores
    // the week on every visit); the conditions legend hides for one that has.
    const seenBefore = window.localStorage.getItem(${JSON.stringify(activationLastWeekStorageKey)}) !== null;
    // Set once per page load and never flipped mid-session: the rule in
    // home-flow.css hides the legend on it, and the legend sits above the
    // verdict, so changing it after paint would move the verdict.
    root.dataset.homeReturning = seenBefore ? "true" : "false";

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
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
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
    "weekly market guidance",
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
    { media: "(prefers-color-scheme: dark)", color: "#10141c" },
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
  ],
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    /* No `data-theme` here. React keeps <html> as a singleton and re-applies its props
       on the client, so an attribute set in this JSX overwrote the one the bootstrap
       script had just written from the reader's stored choice (2026-11-10). The script
       is the only writer; with scripts off the page draws the stylesheet's base theme. */
    <html lang="en" suppressHydrationWarning className="font-sans">
      <head>
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0f1419" />
        {/* Fonts are self-hosted from public/fonts (see app/styles/fonts.css),
            so there is no fonts.googleapis.com stylesheet in the critical path
            and no preconnect to a third-party host. Source Sans 3 sets every line
            of text above the fold, so it is preloaded. Chivo Mono sets aligned
            figures and paste previews, all below the fold; it loads when the
            stylesheet first asks for it. */}
        <link rel="preload" href="/fonts/source-sans-3-variable.45c48165.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* Bricolage Grotesque sets the guidance and the score figures, the largest paint on the brief. */}
        <link rel="preload" href="/fonts/bricolage-grotesque-variable.41784463.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fred.stlouisfed.org" />
        {/* No document prefetch here: no prefetch link to a page, and no
            speculation rules. Both shipped until 2026-11-12 and neither ever
            reached a reader. Cloudflare answers every `Sec-Purpose: prefetch`
            request to a route a Worker serves with a 503 (`cf-speculation-refused`),
            so each page view logged two failed requests in the console; the hover
            rules were never applied, because their file was served as
            `application/json`, which a browser ignores for a rule set. Nor could
            either help where prefetches do arrive: every page is `no-store`, so a
            full navigation fetches it again, and a link clicked inside the site
            is the router's, which prefetches its own payload (that is what makes
            "Build this week's plan →" open at once).
            `tests/documentPrefetch.test.ts` holds this. */}
        {/* No `hrefLang="x-default"` here. It lived in the layout, so every page
            declared the homepage as its x-default target — the same inherited-
            pointer problem as the canonical above. x-default names the fallback
            among a set of language or region alternates, and this site publishes
            one locale and no alternates, so the correct number of these links is
            zero rather than one per page. */}
        {/* Feed autodiscovery. The footer linked /feed.xml as text, which a
            reader app never sees; this is the link readers and crawlers look for. */}
        <link rel="alternate" type="application/rss+xml" href={FEED_URL} title="Whether Weekly Brief (RSS)" />
        {/* Agent discovery: machine-readable alternates for browser-based AI agents */}
        <link rel="alternate" type="text/markdown" href={BRIEF_MD_URL} title="Whether Weekly Brief (Markdown)" />
        <link rel="alternate" type="application/json" href={AGENT_API_URL} title="Whether Weekly Brief (JSON)" />
        <link rel="alternate" type="text/plain" href={LLMS_TXT_URL} title="Whether for LLMs" />
        <link rel="llm" href={LLMS_TXT_URL} />
        <link rel="mcp-manifest" type="application/json" href={WELL_KNOWN_MANIFEST_URL} />
        <link rel="webmcp" href="/.well-known/webmcp.json" type="application/json" />
        <link rel="model-context" href="/.well-known/webmcp.json" type="application/json" />
        <link rel="mcp" href="/.well-known/mcp.json" type="application/json" />
        <meta name="webmcp:endpoint" content="/api/mcp" />
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
        <WebMcpBridge />
        <TooltipProvider>
        <ScrollProgressBar />
        <ToastProviderRoot>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <GlobalHeader />
          <RecordBand />
          <RunningHead />
          <GlobalCommandPalette />
          <ServiceWorkerRegistrar />
          <GlobalTimeMachine />
          <GlobalShareRail />
          <MobileTabBar />
          <ScreenshotDetector />
          <DeadClickBeacon />
          {children}
        </ToastProviderRoot>
        <footer className="border-t border-slate-800/60 bg-[var(--bg-body)] px-4 py-8 sm:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Brand first. The footer opened straight into three centred rows of
                anonymous links: no wordmark, no statement of what the product is,
                on the second-most-common surface a reader checks for exactly
                that. The line is `canonicalPositioningLine`, so it cannot drift
                from the one the metadata already ships. */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12">
              <div className="space-y-3">
                <div className="space-y-2">
                  {/* The wordmark goes home, as one at the foot of a page is expected to (2026-11-03). */}
                  <p className="font-[family-name:var(--font-display)] text-[1.0625rem] font-extrabold leading-none tracking-[-0.01em] text-white">
                    <Link href="/" className="weather-hit no-underline hover:text-slate-200">
                      Whether
                    </Link>
                  </p>
                  <p className="max-w-[32ch] text-fluid-nano leading-relaxed text-[var(--footer-legal)]">
                    {canonicalPositioningLine}
                  </p>
                </div>
                {/* The product outside the four groups, under its name: Use it
                    elsewhere, API & MCP, About, Search, RSS and Calendar. Derived from
                    utilityLinks: the hand-written copy that used to live here
                    drifted, and a page fell out of the footer entirely. */}
                <nav aria-label="About Whether">
                  {/* Wrapped lines need their own row: the seven links ran
                     4+3 at 320px with no vertical gap, so a row sat on the one
                      above it. */}
                  <ul className="flex flex-wrap gap-x-4 gap-y-2">
                    {utilityLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="weather-list-link text-fluid-sm text-[var(--footer-link)] no-underline transition-colors hover:text-[var(--footer-link-hover)]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      {/* A file, not a page — stays an <a> and outside the link set. */}
                      <a
                        href="/feed.xml"
                        className="weather-list-link text-fluid-sm text-[var(--footer-link)] no-underline transition-colors hover:text-[var(--footer-link-hover)]"
                      >
                        RSS
                      </a>
                    </li>
                    <li>
                      {/* The other feed: each Monday's guidance as a calendar
                          event. webcal:// hands it to the reader's calendar app;
                          /share also offers Google's add-by-URL page. */}
                      <a
                        href={CALENDAR_WEBCAL_URL}
                        className="weather-list-link text-fluid-sm text-[var(--footer-link)] no-underline transition-colors hover:text-[var(--footer-link-hover)]"
                      >
                        Calendar
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>

              {/* One column per group, as the header names them: the group's
                  name links its hub, and its other pages follow. Until
                  2026-10-08 this was a "weekly loop" list of seven layers and a
                  "Tools & reference" list of nine, which between them listed
                  /history/compare twice, as "Compare" and "Compare periods".
                  From md only (2026-10-27): below it the tab bar and its More sheet
                  list every page, and the four columns ran about 600px at the foot
                  of every phone page repeating them. */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 max-md:hidden sm:grid-cols-4">
                {navigationGroups.map((group) => {
                  const others = [
                    ...pagesInGroup(group.key)
                      .filter((page) => page.href !== group.href)
                      .map((page) => ({ href: page.href, label: page.label })),
                    ...group.footerLinks,
                  ];
                  return (
                    <nav key={group.key} aria-labelledby={`footer-${group.key}-heading`} className="space-y-1">
                      <Link
                        id={`footer-${group.key}-heading`}
                        href={group.href}
                        className="weather-list-link type-eyebrow text-slate-300 no-underline hover:text-white"
                      >
                        {group.label}
                      </Link>
                      {others.length > 0 ? (
                        <ul>
                          {others.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                className="weather-list-link text-fluid-sm text-[var(--footer-legal)] no-underline transition-colors hover:text-[var(--footer-legal-hover)]"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </nav>
                  );
                })}
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
                className="flex flex-wrap items-center gap-x-6 gap-y-2 text-fluid-nano text-[var(--footer-legal)]"
              >
                <Link href="/privacy" className="weather-list-link no-underline transition-colors hover:text-[var(--footer-legal-hover)]">Privacy</Link>
                <Link href="/acceptable-use-policy" className="weather-list-link no-underline transition-colors hover:text-[var(--footer-legal-hover)]">Acceptable Use</Link>
                <Link href="/terms-of-service" className="weather-list-link no-underline transition-colors hover:text-[var(--footer-legal-hover)]">Terms</Link>
                <a href="https://github.com/zz-plant/whether" className="weather-list-link no-underline transition-colors hover:text-[var(--footer-legal-hover)]" target="_blank" rel="noreferrer">GitHub</a>
                <span className="inline-flex items-center">
                  Built by
                  <a href="https://kanav.net" className="weather-list-link ml-1 no-underline transition-colors hover:text-[var(--footer-link-hover)]" target="_blank" rel="noreferrer">Kanav Jain</a>
                </span>
                <a href="https://nextconsensus.com" className="weather-list-link no-underline transition-colors hover:text-[var(--footer-link-hover)]" target="_blank" rel="noreferrer">NextConsensus</a>
                <span className="inline-flex items-center">© 2026 Whether</span>
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
