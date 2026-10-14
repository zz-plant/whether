const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const staticGenerationWorkers = parsePositiveInt(process.env.NEXT_STATIC_GENERATION_WORKERS);
const staticGenerationMinPagesPerWorker = parsePositiveInt(process.env.NEXT_STATIC_GENERATION_MIN_PAGES_PER_WORKER);
const buildCpus = parsePositiveInt(process.env.NEXT_BUILD_CPUS);

const permanentRedirect = (source, destination) => ({ source, destination, permanent: true });

const buildPermanentRedirects = (pairs) =>
  pairs.map(([source, destination]) => permanentRedirect(source, destination));

export const solutionRedirectPairs = [
  ["/solutions/engineering-capacity", "/toolkits/ops-capacity"],
  ["/solutions/product-roadmapping", "/toolkits/focus"],
  ["/solutions/market-regime-playbook", "/resolve/ops-risk"],
  ["/solutions/career-paths", "/resolve/product"],
  ["/solutions/career-paths/senior-product-manager", "/resolve/product"],
  ["/solutions/career-paths/group-product-manager", "/resolve/product"],
  ["/solutions/career-paths/director-of-product", "/resolve/product"],
  ["/solutions/career-paths/vp-product", "/resolve/ceo"],
  ["/solutions/career-paths/product-strategy-chief-of-staff", "/resolve/ops-risk"],
  // /resolve stopped being a page on 2026-10-08; the role and situation pages it
  // listed are Guides' "More tools", which is where a retired solution belongs.
  ["/solutions/:path*", "/resources#more-tools"],
];

export const canonicalSurfaceRedirectPairs = [
  // Legacy posture → root
  ["/startup-macro-posture/index", "/trust#formula-reference"],
  ["/startup-macro-posture/:regime", "/"],
  ["/startup-macro-posture", "/"],
  // Posture stub pages (deleted) → root
  ["/posture", "/"],
  ["/posture/:slug", "/"],
  // Legacy methodology → Trust hub
  ["/methodology", "/trust#formula-reference"],
  // Consolidated under Trust hub
  ["/sources", "/trust#source-board"],
  ["/confidence", "/trust#confidence-limits"],
  // Decision answer root → the answers on Guides, grouped by decision area
  ["/answers", "/resources#answers"],
  /*
   * Resolve folded into Decide and Guides on 2026-10-08. Its page answered "one
   * open decision": Decide's "Test a decision" step does that for the reader's
   * own move, so the bare path lands there; its eleven direct answers are on
   * Guides, grouped by decision area, and the browse-by-role, stage, situation
   * and toolkit paths are Guides' "More tools". A link that carries one of those
   * selections (`?stakeholder=` and friends, which the `/guides/*` rules below
   * used to produce and browsers have cached as 308s) is sent to More tools by
   * `resolveSelectionRedirects`, ahead of this rule. /resolve/<slug> pages keep
   * their addresses.
   */
  ["/resolve", "/operate#ops-decision-shield"],
  // Nav-label aliases: legacy names that links and habits still carry. /answer
  // was Resolve's directory before /resolve; both land where Resolve went.
  ["/evidence", "/signals"],
  ["/answer", "/operate#ops-decision-shield"],
  ["/planning", "/operate"],
  // Learn root + failure modes → Trust hub
  ["/learn", "/trust"],
  ["/learn/failure-modes", "/trust#revisit-call"],
  ["/learn/failure-modes/:slug", "/trust#revisit-call"],
  // Learn's concepts index and the hub's other names: /library and /reference are
  // what the same pages were called between February and March 2026. The table
  // that forwarded them went in d0ddedd6 (2026-03-16) with nothing in its place,
  // so their deep links 404'd. Concept essays land on the one list, failure modes
  // on the revisit triggers, the hubs where /learn does.
  ["/learn/concepts/:path*", "/concepts"],
  ["/library", "/trust"],
  ["/library/canon/:path*", "/concepts"],
  ["/library/failure-modes/:path*", "/trust#revisit-call"],
  ["/reference", "/trust"],
  ["/reference/concepts/:path*", "/concepts"],
  ["/reference/failure-modes/:path*", "/trust#revisit-call"],
  // /concepts itself is a page again (restored 2026-09-23). The first version's
  // detail, focus, audience and conflicts pages are not: one page carries the
  // list now, with an anchor per essay. The old `/concepts` -> `/trust` rule was a
  // 308, so a browser that followed it keeps landing on /trust until its cache
  // clears; the `/resources` note below records the same standing cost.
  ["/concepts/:path+", "/concepts"],
  // Decide redirect stubs. Both spellings, and both above the wildcard below:
  // team-context is not a generated param on either route, so without these it
  // would 404 rather than land on the plan.
  ["/resolve/team-context", "/operate#ops-monthly-action-summary"],
  ["/answer/team-context", "/operate#ops-monthly-action-summary"],
  // Operations sub-pages flattened. These must precede the /planning wildcard
  // below: /operate has only financial and memory, so a wildcard would send
  // /planning/data to /operate/data, which does not exist.
  ["/planning/data", "/operate"],
  ["/planning/cli", "/operate"],
  ["/planning/integrations", "/operate"],
  // The ledger moved under history. Pointed straight there rather than at
  // /operate/memory, which would chain through a second redirect.
  ["/planning/memory", "/history"],
  // The same aliases one level down. Matching only the bare path left every
  // legacy sub-path a 404 — /answer/ceo and /evidence/capital-tightness-watch
  // among them — so external links and anything still pointing at the old names
  // died silently. Must stay below the specific /answer/* rules above, which a
  // wildcard would otherwise shadow.
  ["/answer/:path*", "/resolve/:path*"],
  ["/evidence/:path*", "/signals/:path*"],
  ["/planning/:path*", "/operate/:path*"],
  /*
   * `/resources` is a real hub again and is NOT listed here. Removing a rule
   * from this list does not undo it for anyone who already followed it: every
   * pair below becomes a 308, browsers cache a permanent redirect indefinitely,
   * and Google treats it as a canonicalisation signal. So a returning reader
   * whose browser saw the old `/resources` -> `/operate#ops-export-briefs` keeps
   * landing on /operate until their cache clears, while a crawler re-fetching
   * the URL gets the hub and re-canonicalises on its own schedule. Nothing in
   * this file can shorten the first half; it is the standing cost of having
   * made the redirect permanent, and the same trap the `/guides` note records.
   */
  // The role × decision-area and toolkit × signal cluster pages (51 of them)
  // were retired on 2026-09-15. Each rendered the same site-wide call as its
  // parent, was noindex, and had no inbound link, so the parent is the page.
  ["/resolve/:slug/:cluster", "/resolve/:slug"],
  ["/toolkits/:slug/:cluster", "/toolkits/:slug"],
  // Guides staging redirects. These pointed at `/guides`, which stopped existing in
  // 14258b64 — so every one of them was a 308 into a 404, which is worse than a plain
  // 404 because a permanent redirect gets cached and followed. The content itself moved
  // rather than being retired. Since 2026-10-08 Guides is the `/resources` page, which
  // reads the same `stakeholder`, `stage` and `library` params
  // (GuidedTranslationSearchParams) under "More tools" and still imports the guides
  // data from `app/guides/`, so this is a base swap that preserves every parameter.
  // `/guides` and `/guides/stage` stay ahead of `/guides/:stakeholder`, which would
  // otherwise capture "stage" as a stakeholder slug.
  ["/guides", "/resources"],
  ["/guides/stage/:stage", "/resources?stage=:stage#more-tools"],
  ["/guides/stage", "/resources?library=stages#more-tools"],
  ["/guides/:stakeholder", "/resources?stakeholder=:stakeholder#more-tools"],
  // Retrofit redirects (links that soft-404)
  ["/settings", "/"],
  ["/decision-tools", "/operate#ops-decision-shield"],
  ["/toolkits", "/"],
];

export const iaConsolidationRedirectPairs = [
  // History surfaces consolidated into /history
  ["/archive", "/history"],
  ["/regime-changes", "/history"],
  // The 2010 and 2011 period pages predated the record's first month-end
  // (Jan 31, 2012) and printed readings as if they were on it. They are no
  // longer generated (2026-10-07); a link to one lands on the record instead.
  ...["2010", "2011"].flatMap((year) => [
    [`/history/${year}`, "/history"],
    ...["q1", "q2", "q3", "q4"].map((quarter) => [`/history/${year}-${quarter}`, "/history"]),
  ]),
  // Redirect stubs — kept as permanent redirects for external links
  ["/current-regime", "/"],
  ["/this-week", "/"],
  // The bounded-decision framework and its blank form are a section of /trust,
  // beside the formula the thresholds come from. Both old doors keep an anchor.
  ["/template", "/about#template"],
  ["/threshold", "/about#method"],
  // Orphaned export page — functionality lives in /share
  ["/export/board-packet", "/share"],
  // Empty container — no index page exists
  ["/export", "/share"],
  // Decision memory asked the reader to save at decision time, in this browser,
  // and come back to the same browser later. The record the product can keep
  // without being asked is the call itself, which /history already holds.
  ["/operate/memory", "/history"],
  ["/history/decisions", "/history"],
  // The ship checklist's one useful question is a direct answer now.
  ["/resolve/ship-checklist", "/resources#answers"],
  // /state ran the brief's own pipeline and rendered a subset of the hero under
  // its own H1 — a view of `/` that read as a second, independently derived
  // answer, and competed with `/` and `/brief/[week]` for the same query.
  ["/state", "/"],
  // The embed builder is a section of the share page: same artifact, different
  // container. Two doors to "get the brief out" said nothing about each other.
  ["/embed", "/share#embed"],
  // The glossary defined 26 terms the pages used without explaining. Each one
  // now carries its meaning where it appears, and the method terms that only a
  // formula needs are defined on the formula cards, which is where this lands.
  ["/glossary", "/trust#formula-reference"],
];

/*
 * `/resolve` with a selection on it: the role, stage, library and toolkit views
 * that page drew from its query string are Guides' "More tools" now. The query
 * survives a redirect, so `/resolve?stakeholder=founders-ceos` lands on
 * `/resources?stakeholder=founders-ceos#more-tools` with the same view open.
 * Listed before the pairs: the bare `/resolve` rule would otherwise claim them.
 */
export const resolveSelectionRedirects = ["stakeholder", "stage", "library", "toolkitQuery"].map((key) => ({
  source: "/resolve",
  has: [{ type: "query", key }],
  destination: "/resources#more-tools",
  permanent: true,
}));

export const redirectEntries = [
  ...resolveSelectionRedirects,
  ...buildPermanentRedirects(solutionRedirectPairs),
  ...buildPermanentRedirects(canonicalSurfaceRedirectPairs),
  ...buildPermanentRedirects(iaConsolidationRedirectPairs),
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/*
 * No page Cache-Control here, on purpose. Four blocks used to set
 * `public, s-maxage=…` on `/`, `/share`, `/trust` and `/signals`, and none of them
 * ever shipped: every one of those routes reads `searchParams`, which makes it
 * dynamic, and vinext stamps `no-store, must-revalidate` on a dynamic response
 * over whatever this config says (node_modules/vinext/dist/server/cache-control.js).
 * The homepage one would have been a bug the day it did ship: `/` renders from the
 * stage and runway cookies (lib/report/operatorContext.ts), so a shared edge cache
 * would serve one reader's tailored page to the next. Measured 2026-09-23, warm
 * responses are 80-180ms on every route; the slow tail is cold starts, which a
 * header cannot fix. `tests/pageCacheHeaders.test.ts` keeps them out.
 */

/*
 * Which user agents get metadata in <head> instead of streamed into <body>.
 *
 * A page whose `generateMetadata` awaits the report read (every answer page,
 * every published week) streams its <title>, description, canonical and OG
 * tags after the content — 43KB into the body on an answer page — unless the
 * requester is on this list. The framework default names the social unfurlers
 * and Bing, and leaves off Googlebot (it runs JavaScript, so the tags reach
 * <head> after hydration) and every AI crawler. That is the wrong trade here:
 * Google ignores a rel=canonical outside <head> in the HTML it first fetches,
 * and the retrieval crawlers `app/robots.ts` names as the readers this site
 * exists for do not run JavaScript at all. So: the default list, then Google's
 * own crawler, then every agent `robots.ts` names.
 * `tests/htmlLimitedBots.test.ts` fails if robots.ts names one this does not.
 */
export const htmlLimitedBots = [
  String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`,
  "Googlebot",
  "OAI-SearchBot|ChatGPT-User|GPTBot",
  "PerplexityBot|Perplexity-User",
  "ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai",
  "Amazonbot|CCBot|meta-externalagent",
].join("|");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  htmlLimitedBots,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return redirectEntries;
  },
  experimental: {
    ...(staticGenerationWorkers ? { staticGenerationMaxConcurrency: staticGenerationWorkers } : {}),
    ...(staticGenerationMinPagesPerWorker ? { staticGenerationMinPagesPerWorker } : {}),
    ...(buildCpus ? { cpus: buildCpus } : {}),
  },
};

export default nextConfig;
