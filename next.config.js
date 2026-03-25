const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const staticGenerationWorkers = parsePositiveInt(process.env.NEXT_STATIC_GENERATION_WORKERS);
const staticGenerationMinPagesPerWorker = parsePositiveInt(process.env.NEXT_STATIC_GENERATION_MIN_PAGES_PER_WORKER);
const buildCpus = parsePositiveInt(process.env.NEXT_BUILD_CPUS);

const solutionRedirects = [
  {
    source: "/solutions/engineering-capacity",
    destination: "/toolkits/ops-capacity",
    permanent: true,
  },
  {
    source: "/solutions/product-roadmapping",
    destination: "/toolkits/focus",
    permanent: true,
  },
  {
    source: "/solutions/market-regime-playbook",
    destination: "/decide/ops-risk",
    permanent: true,
  },
  {
    source: "/solutions/career-paths",
    destination: "/decide/product",
    permanent: true,
  },
  {
    source: "/solutions/career-paths/senior-product-manager",
    destination: "/decide/product",
    permanent: true,
  },
  {
    source: "/solutions/career-paths/group-product-manager",
    destination: "/decide/product",
    permanent: true,
  },
  {
    source: "/solutions/career-paths/director-of-product",
    destination: "/decide/product",
    permanent: true,
  },
  {
    source: "/solutions/career-paths/vp-product",
    destination: "/decide/ceo",
    permanent: true,
  },
  {
    source: "/solutions/career-paths/product-strategy-chief-of-staff",
    destination: "/decide/ops-risk",
    permanent: true,
  },
  {
    source: "/solutions/:path*",
    destination: "/decide",
    permanent: true,
  },
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
    return [
      ...solutionRedirects,
      {
        source: "/startup-macro-posture/index",
        destination: "/method#formula-reference",
        permanent: true,
      },
      {
        source: "/startup-macro-posture/:regime",
        destination: "/posture/:regime",
        permanent: true,
      },
      {
        source: "/startup-macro-posture",
        destination: "/posture",
        permanent: true,
      },
      {
        source: "/methodology",
        destination: "/method#formula-reference",
        permanent: true,
      },
      {
        source: "/learn",
        destination: "/learn/failure-modes",
        permanent: true,
      },
      {
        source: "/operations/data",
        destination: "/operations",
        permanent: true,
      },
      {
        source: "/operations/cli",
        destination: "/operations",
        permanent: true,
      },
      {
        source: "/operations/integrations",
        destination: "/operations",
        permanent: true,
      },
    ];
  },
  experimental: {
    ...(staticGenerationWorkers ? { staticGenerationMaxConcurrency: staticGenerationWorkers } : {}),
    ...(staticGenerationMinPagesPerWorker ? { staticGenerationMinPagesPerWorker } : {}),
    ...(buildCpus ? { cpus: buildCpus } : {}),
  },
};

export default nextConfig;
