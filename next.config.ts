import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose EVENT_SEASON to client components (see getCurrentSeason in
  // src/lib/season.ts) without a second variable to keep in sync.
  env: {
    NEXT_PUBLIC_EVENT_SEASON: process.env.EVENT_SEASON,
  },
  // Security and caching headers
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year cache for images
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
};

export default nextConfig;
