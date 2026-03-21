/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // Compress responses
  compress: true,
  // Strict mode for better error detection
  reactStrictMode: true,
  // Disable x-powered-by header
  poweredByHeader: false,
  // Standalone output for Docker
  output: 'standalone',
}

module.exports = nextConfig
