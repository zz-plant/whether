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
  // Learn root + failure modes → Trust hub
  ["/learn", "/trust"],
  ["/learn/failure-modes", "/trust#revisit-call"],
  ["/learn/failure-modes/:slug", "/trust#revisit-call"],
  // Concepts (all paths) → Trust hub
  ["/concepts/:path*", "/trust"],
  // About → Trust hub
  ["/about", "/trust"],
  // Decide redirect stubs
  ["/resolve/team-context", "/planning#ops-monthly-action-summary"],
  // Resources root → Planning
  ["/resources", "/planning#ops-export-briefs"],
  // Guides staging redirects
  ["/guides/stage/:stage", "/guides?stage=:stage"],
  ["/guides/stage", "/guides?library=stages"],
  ["/guides/:stakeholder", "/guides?stakeholder=:stakeholder"],
  // Operations sub-pages flattened
  ["/planning/data", "/planning"],
  ["/planning/cli", "/planning"],
  ["/planning/integrations", "/planning"],
  // Retrofit redirects (links that soft-404)
  ["/settings", "/"],
  ["/decision-tools", "/resolve"],
  ["/toolkits", "/"],
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
