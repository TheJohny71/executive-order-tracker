/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['www.whitehouse.gov'],
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
  },
  api: {
    bodyParser: {
      sizeLimit: '1mb' // Specify a string value for sizeLimit
    }
  },
  // Specify allowed origins as a string array if needed
  cors: {
    allowedOrigins: ['https://example.com']
  }
};

export default config;