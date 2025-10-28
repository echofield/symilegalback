/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Do not block production builds on ESLint warnings/errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even if there are TS errors
    // (we still surface them in CI/logs)
    ignoreBuildErrors: true,
  },
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

