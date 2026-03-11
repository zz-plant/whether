const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const staticGenerationWorkers = parsePositiveInt(process.env.NEXT_STATIC_GENERATION_WORKERS);
const staticGenerationMinPagesPerWorker = parsePositiveInt(process.env.NEXT_STATIC_GENERATION_MIN_PAGES_PER_WORKER);
const buildCpus = parsePositiveInt(process.env.NEXT_BUILD_CPUS);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Build pipelines run typecheck separately (`bun run check`),
  // so we skip duplicated TypeScript validation during `next build` to reduce deploy time.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    ...(staticGenerationWorkers ? { staticGenerationMaxConcurrency: staticGenerationWorkers } : {}),
    ...(staticGenerationMinPagesPerWorker ? { staticGenerationMinPagesPerWorker } : {}),
    ...(buildCpus ? { cpus: buildCpus } : {}),
  },
  async redirects() {
    return [
      {
        source: '/operate',
        destination: '/operations',
        permanent: true,
      },
      {
        source: '/templates',
        destination: '/toolkits',
        permanent: true,
      },
      {
        source: '/toolkit',
        destination: '/toolkits',
        permanent: true,
      },
      {
        source: '/evidence/:path*',
        destination: '/signals/:path*',
        permanent: true,
      },
      {
        source: '/reference/concepts/:slug',
        destination: '/concepts/:slug',
        permanent: true,
      },
      {
        source: '/reference/failure-modes/:slug',
        destination: '/library/failure-modes/:slug',
        permanent: true,
      },
      {
        source: '/reference/:path*',
        destination: '/method/:path*',
        permanent: true,
      },
      {
        source: '/learn/concepts/:slug',
        destination: '/concepts/:slug',
        permanent: true,
      },
      {
        source: '/learn/failure-modes/:slug',
        destination: '/library/failure-modes/:slug',
        permanent: true,
      },
      {
        source: '/library',
        destination: '/learn',
        permanent: true,
      },
      {
        source: '/brief/:stakeholder',
        destination: '/guides/:stakeholder',
        permanent: true,
      },
      {
        source: '/brief/stage/:stage',
        destination: '/guides/stage/:stage',
        permanent: true,
      },
      {
        source: '/operations/briefings',
        destination: '/operations',
        permanent: false,
      },
      {
        source: '/operations/decisions',
        destination: '/operations',
        permanent: false,
      },
      {
        source: '/library/canon/:slug',
        destination: '/concepts/:slug',
        permanent: true,
      },
      {
        source: '/use-cases/:slug',
        destination: '/decide/:slug',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
