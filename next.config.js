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
  ["/solutions/market-regime-playbook", "/decide/ops-risk"],
  ["/solutions/career-paths", "/decide/product"],
  ["/solutions/career-paths/senior-product-manager", "/decide/product"],
  ["/solutions/career-paths/group-product-manager", "/decide/product"],
  ["/solutions/career-paths/director-of-product", "/decide/product"],
  ["/solutions/career-paths/vp-product", "/decide/ceo"],
  ["/solutions/career-paths/product-strategy-chief-of-staff", "/decide/ops-risk"],
  ["/solutions/:path*", "/decide"],
];

export const canonicalSurfaceRedirectPairs = [
  // Legacy posture → root
  ["/startup-macro-posture/index", "/method#formula-reference"],
  ["/startup-macro-posture/:regime", "/"],
  ["/startup-macro-posture", "/"],
  // Posture stub pages (deleted) → root
  ["/posture", "/"],
  ["/posture/:slug", "/"],
  // Legacy methodology → Trust hub
  ["/methodology", "/method#formula-reference"],
  // Consolidated under Trust hub
  ["/sources", "/method#sources-freshness"],
  ["/confidence", "/method#confidence-limits"],
  // Decision answer root → Decide hub
  ["/answers", "/decide#direct-answers"],
  // Learn root + failure modes → Trust hub
  ["/learn", "/method"],
  ["/learn/failure-modes", "/method#revisit-call"],
  ["/learn/failure-modes/:slug", "/method#revisit-call"],
  // Concepts (all paths) → Trust hub
  ["/concepts/:path*", "/method"],
  // About → Trust hub
  ["/about", "/method"],
  // Decide redirect stubs
  ["/decide/team-context", "/operations#ops-monthly-action-summary"],
  // Resources root → Planning
  ["/resources", "/operations#ops-export-briefs"],
  // Guides staging redirects
  ["/guides/stage/:stage", "/guides?stage=:stage"],
  ["/guides/stage", "/guides?library=stages"],
  ["/guides/:stakeholder", "/guides?stakeholder=:stakeholder"],
  // Operations sub-pages flattened
  ["/operations/data", "/operations"],
  ["/operations/cli", "/operations"],
  ["/operations/integrations", "/operations"],
];

export const redirectEntries = [
  ...buildPermanentRedirects(solutionRedirectPairs),
  ...buildPermanentRedirects(canonicalSurfaceRedirectPairs),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
