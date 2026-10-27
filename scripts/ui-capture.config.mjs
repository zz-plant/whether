/**
 * What `scripts/ui-capture.lib.mjs` captures in this app, and how this app is told which
 * variant to render. The library is the capture mechanism — probe, launch, wait, shoot,
 * write the gallery — and names nothing about Whether; everything below does.
 */

/** The gallery page's title. */
export const galleryTitle = "Whether UI Capture Gallery";

/** A route that answers 200 (or 503 while degraded) once the server is up. */
export const healthPath = "/api/health";

/**
 * Routes whose main content streams in after `load`, and the element that marks it
 * arrived. The homepage brief streams, so a capture of "/" waits for the share artifact
 * to hydrate before screenshotting. Keyed by pathname; a target's own `readySelector`
 * wins over this.
 */
export const streamedContentReadySelectors = new Map([["/", "#share-ready-artifact"]]);

const THEME_STORAGE_KEY = "whether-theme";
const ACTIVATION_LAST_WEEK_STORAGE_KEY = "whether.activation.lastWeek";

/**
 * Same ISO-week arithmetic and slug as lib/isoWeek.ts, which a Node script cannot import.
 * tests/uiCaptureLib.test.ts holds the two to the same answer.
 */
export const isoWeekSlug = (date) => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-w${String(week).padStart(2, "0")}`;
};

/**
 * The localStorage entries a page is seeded with before its first script runs, in order.
 *
 * `light` seeds the key the layout's theme bootstrap reads (`buildThemeBootstrapScript` in
 * app/layout.tsx), so the page renders light from the first frame. `returning` seeds the
 * week this browser last saw (`activationLastWeekStorageKey` in lib/activationFunnel.ts) as
 * last week's slug — the gap of a weekly returner — so `/` renders the returning reader's
 * page, without the conditions legend.
 */
export const captureStorageSeeds = ({ theme, visitor, now = Date.now() }) => [
  ...(theme === "light" ? [[THEME_STORAGE_KEY, "light"]] : []),
  ...(visitor === "returning"
    ? [[ACTIVATION_LAST_WEEK_STORAGE_KEY, isoWeekSlug(new Date(now - 7 * 86400000))]]
    : []),
];

const MOBILE = { width: 430, height: 932 };
const DESKTOP = { width: 1600, height: 1400 };

/**
 * The live operator routes. These are the surfaces the product is judged on, so
 * layout work needs before/after evidence for them — the mockup targets below
 * only cover staged concepts under /mockups.
 */
const liveRoutes = [
  { slug: "home", label: "Weekly brief (/)", path: "/" },
  { slug: "evidence", label: "Why it changed", path: "/signals" },
  { slug: "planning", label: "Decide", path: "/operate" },
  // Guides took Resolve's direct answers on 2026-10-08; /resolve redirects.
  { slug: "guides", label: "Guides", path: "/resources" },
  { slug: "trust", label: "How much to trust this week", path: "/trust" },
  // Added 2026-08-29. These were never captured, so the UI facelift that reviewed
  // the five above could not have seen them, and two are on the path a launch
  // visitor actually walks: /brief is where every shared artifact links, and
  // /history carries the track record that answers "is this a horoscope". /share
  // is where the artifacts are copied.
  { slug: "history", label: "Record", path: "/history" },
  { slug: "brief", label: "Published brief", path: "/brief/2026-w31" },
  { slug: "share", label: "Share", path: "/share" },
  // Restored 2026-09-23: product writing placed on the month-end record.
  { slug: "concepts", label: "Product writing", path: "/concepts" },
  // The plain-language entry point. It was a disclosure inside /trust, so the
  // one surface addressed to a reader who does not yet know the vocabulary was
  // never captured and never reviewed.
];

const liveTargets = liveRoutes.flatMap(({ slug, label, path }) => [
  {
    id: `${slug}-mobile`,
    label: `${label} / mobile`,
    path,
    viewport: MOBILE,
    fullPage: true,
    // A phone screenshot is a 3x image of one screen, and that is the picture
    // of this route that travels. The full page at 1x cannot show either: type
    // that reads fine at 1x blurs at the size a channel shows it, and what the
    // top of the page holds is lost in a 7,000px strip. So mobile captures
    // render at 3x and also save the first screen on its own.
    deviceScaleFactor: 3,
    firstScreen: true,
  },
  {
    id: `${slug}-desktop`,
    label: `${label} / desktop`,
    path,
    viewport: DESKTOP,
    fullPage: true,
  },
]);

export const uiCaptureTargets = [
  ...liveTargets,
  {
    id: "operator-brief-mobile",
    label: "Operator brief / mobile compact",
    path: "/mockups/operator-brief?viewport=mobile&density=compact",
    viewport: { width: 430, height: 932 },
    fullPage: true,
  },
  {
    id: "operator-brief-tablet",
    label: "Operator brief / tablet comfortable",
    path: "/mockups/operator-brief?viewport=tablet&density=comfortable",
    viewport: { width: 1024, height: 1280 },
    fullPage: true,
  },
  {
    id: "operator-brief-desktop",
    label: "Operator brief / desktop comfortable",
    path: "/mockups/operator-brief?viewport=desktop&density=comfortable",
    viewport: { width: 1600, height: 1400 },
    fullPage: true,
  },
];

/**
 * What the frame audit (`bun run ui:frames`, scripts/ui-frames.mjs) walks: the live routes
 * above plus the record and reading pages a shared screenshot also comes from. Each is
 * framed at a common laptop screen and a common phone, because those are the two pictures
 * of a page that get pasted.
 */
const READING = ["site", "date", "conditions"];
const PAGE = ["site"];
export const frameAuditRoutes = [
  ...liveRoutes
    .filter(({ path }) => !path.startsWith("/brief/"))
    // A page that reports this week's reading names it in every frame; a page that is read
    // (guides, product writing) names the site, and has no week to name.
    .map(({ path }) => ({ path, requires: ["/resources", "/concepts"].includes(path) ? PAGE : READING })),
  { path: "/operate/financial", requires: READING },
  { path: "/calibration", requires: PAGE },
  { path: "/about", requires: PAGE },
];

export const frameAuditViewports = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "phone", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true },
];

/**
 * The blocks a reader frames: cards, figures and tables. A block that holds another is
 * judged by the inner one, so a section card is not "too tall" for holding three charts that
 * each fit. `data-frame-exempt` marks a block that is long by nature and opened on purpose
 * (the full monthly archive), with the reason beside it in the source.
 */
export const frameBlockSelector =
  "main figure, main table, main .weather-surface, main .weather-panel, main .weather-panel-static, main article, main [data-frame-block]";
