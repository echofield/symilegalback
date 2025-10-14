/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    outputFileTracingIncludes: {
      '/api/contracts': ['./contracts/**'],
      '/api/contracts/[id]': ['./contracts/**']
    }
  }
};

module.exports = nextConfig;

