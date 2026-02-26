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
    ];
  },
};

export default nextConfig;
