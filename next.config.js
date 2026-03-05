/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Build pipelines run typecheck separately (`bun run check`),
  // so we skip duplicated TypeScript validation during `next build` to reduce deploy time.
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/evidence/:path*',
        destination: '/signals/:path*',
        permanent: true,
      },
      {
        source: '/learn',
        destination: '/reference',
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
