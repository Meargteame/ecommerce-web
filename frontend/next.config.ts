import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // Use env var if set, otherwise fall back to the production backend URL
    const backendUrl = process.env.BACKEND_URL 
      || process.env.NEXT_PUBLIC_BACKEND_URL 
      || 'https://shophub.abyssiniabazaar.com'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
