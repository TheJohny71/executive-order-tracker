/** @type {import('next').NextConfig} */
const config = {
  images: {
    domains: ['www.whitehouse.gov'],
  },
  // Add development settings
  reactStrictMode: true,
  // Remove serverActions as it's enabled by default now
  experimental: {
    // Add any future experimental features here
  },
  // Prevent excessive caching during development
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  }
};

export default config;
