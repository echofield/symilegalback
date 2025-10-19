/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    outputFileTracingIncludes: {
      '/api/**': ['./contracts/**']
    }
  },
  async rewrites() {
    return [
      { source: '/api/bond/:path*', destination: '/api/escrow/:path*' },
    ];
  }
};

module.exports = nextConfig;

