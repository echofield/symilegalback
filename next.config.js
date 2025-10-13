/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    outputFileTracingIncludes: {
      '/api/**': ['./contracts/**']
    }
  }
};

module.exports = nextConfig;

