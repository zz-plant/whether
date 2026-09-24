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
  ["/solutions/:path*", "/resolve"],
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
  ["/sources", "/trust#sources-freshness"],
  ["/confidence", "/trust#confidence-limits"],
  // Decision answer root → Decide hub
  ["/answers", "/resolve#direct-answers"],
  // Nav-label aliases. The header, the page title and the IA all said "Resolve"
  // while the directory said /answer — one letter from the unrelated /answers
  // corpus. /resolve is the filesystem route now, so this pair inverts: the old
  // path is the legacy name that links and habits still carry.
  ["/evidence", "/signals"],
  ["/answer", "/resolve"],
  ["/planning", "/operate"],
  // Learn root + failure modes → Trust hub
  ["/learn", "/trust"],
  ["/learn/failure-modes", "/trust#revisit-call"],
  ["/learn/failure-modes/:slug", "/trust#revisit-call"],
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
  // rather than being retired: `/resolve` reads the same `stakeholder`, `stage` and
  // `library` params (GuidedTranslationSearchParams) and still imports the guides data
  // from `app/guides/`, so this is a base swap that preserves every parameter.
  // `/guides` and `/guides/stage` stay ahead of `/guides/:stakeholder`, which would
  // otherwise capture "stage" as a stakeholder slug.
  ["/guides", "/resolve"],
  ["/guides/stage/:stage", "/resolve?stage=:stage"],
  ["/guides/stage", "/resolve?library=stages"],
  ["/guides/:stakeholder", "/resolve?stakeholder=:stakeholder"],
  // Retrofit redirects (links that soft-404)
  ["/settings", "/"],
  ["/decision-tools", "/resolve"],
  ["/toolkits", "/"],
];

export const iaConsolidationRedirectPairs = [
  // History surfaces consolidated into /history
  ["/archive", "/history"],
  ["/regime-changes", "/history"],
  // Redirect stubs — kept as permanent redirects for external links
  ["/current-regime", "/"],
  ["/this-week", "/"],
  // The bounded-decision framework and its blank form are a section of /trust,
  // beside the formula the thresholds come from. Both old doors keep an anchor.
  ["/template", "/trust#template"],
  ["/threshold", "/trust#framework"],
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
  ["/resolve/ship-checklist", "/resolve#direct-answers"],
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

export const redirectEntries = [
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
