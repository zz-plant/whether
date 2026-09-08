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
  // Concepts (all paths) → Trust hub
  ["/concepts/:path*", "/trust"],
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
  ["/planning/memory", "/history/decisions"],
  // The same aliases one level down. Matching only the bare path left every
  // legacy sub-path a 404 — /answer/ceo and /evidence/capital-tightness-watch
  // among them — so external links and anything still pointing at the old names
  // died silently. Must stay below the specific /answer/* rules above, which a
  // wildcard would otherwise shadow.
  ["/answer/:path*", "/resolve/:path*"],
  ["/evidence/:path*", "/signals/:path*"],
  ["/planning/:path*", "/operate/:path*"],
  // Resources root → Planning
  ["/resources", "/operate#ops-export-briefs"],
  // Guides staging redirects
  ["/guides/stage/:stage", "/guides?stage=:stage"],
  ["/guides/stage", "/guides?library=stages"],
  ["/guides/:stakeholder", "/guides?stakeholder=:stakeholder"],
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
  // The blank bounded-decision form is a section of the framework page it used
  // to link out to, so the form keeps its own entry point via the anchor.
  ["/template", "/threshold#template"],
  // Orphaned export page — functionality lives in /share
  ["/export/board-packet", "/share"],
  // Empty container — no index page exists
  ["/export", "/share"],
  // Decision memory is a record of what was decided, which is history, not
  // planning. /operate keeps the tools for deciding.
  ["/operate/memory", "/history/decisions"],
  // /state ran the brief's own pipeline and rendered a subset of the hero under
  // its own H1 — a view of `/` that read as a second, independently derived
  // answer, and competed with `/` and `/brief/[week]` for the same query.
  ["/state", "/"],
  // The embed builder is a section of the share page: same artifact, different
  // container. Two doors to "get the brief out" said nothing about each other.
  ["/embed", "/share#embed"],
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

const homepageCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=300, stale-while-revalidate=600",
  },
];

const shareCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=300, stale-while-revalidate=600",
  },
];

const trustCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=900, stale-while-revalidate=1800",
  },
];

const evidenceCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=900, stale-while-revalidate=1800",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/",
        headers: homepageCacheHeaders,
      },
      {
        source: "/share",
        headers: shareCacheHeaders,
      },
      {
        source: "/trust",
        headers: trustCacheHeaders,
      },
      {
        source: "/signals",
        headers: evidenceCacheHeaders,
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
