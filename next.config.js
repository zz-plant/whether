/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async redirects() {
    return [
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
        source: '/evidence',
        destination: '/signals',
        permanent: false,
      },
      {
        source: '/plan',
        destination: '/operations',
        permanent: false,
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
    ];
  },
};

export default nextConfig;
