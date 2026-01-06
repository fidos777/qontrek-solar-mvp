/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@qontrek/core', '@qontrek/civos', '@qontrek/solar-worker'],
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  }
}
module.exports = nextConfig
