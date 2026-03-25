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
  // Build pipelines run typecheck separately (`bun run check`),
  // so we skip duplicated TypeScript validation during `next build` to reduce deploy time.
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
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
    ];
  },
  experimental: {
    ...(staticGenerationWorkers ? { staticGenerationMaxConcurrency: staticGenerationWorkers } : {}),
    ...(staticGenerationMinPagesPerWorker ? { staticGenerationMinPagesPerWorker } : {}),
    ...(buildCpus ? { cpus: buildCpus } : {}),
  },
};

export default nextConfig;
