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
  ["/startup-macro-posture/index", "/method#formula-reference"],
  ["/startup-macro-posture/:regime", "/posture/:regime"],
  ["/startup-macro-posture", "/posture"],
  ["/methodology", "/method#formula-reference"],
  ["/learn", "/learn/failure-modes"],
  ["/guides/stage/:stage", "/guides?stage=:stage"],
  ["/guides/stage", "/guides?library=stages"],
  ["/guides/:stakeholder", "/guides?stakeholder=:stakeholder"],
  ["/concepts/conflicts", "/concepts?view=conflicts"],
  ["/concepts/focus/:focus", "/concepts?focus=:focus"],
  ["/concepts/audience/:audience", "/concepts?audience=:audience"],
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
  // Build pipelines run typecheck separately (`bun run check`),
  // so we skip duplicated TypeScript validation during `next build` to reduce deploy time.
  typescript: {
    ignoreBuildErrors: true,
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
