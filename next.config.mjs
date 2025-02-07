/** @type {import('next').NextConfig} */
const config = {
  images: {
    domains: ['www.whitehouse.gov'],
    // Add image optimization settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  reactStrictMode: true,
  // Add performance optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enhanced security headers
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
          // Add Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' www.whitehouse.gov data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://www.whitehouse.gov",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // Add Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Add Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Add Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  // Add webpack configuration for optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize CSS
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        styles: {
          name: 'styles',
          test: /\.(css|scss)$/,
          chunks: 'all',
          enforce: true,
        },
      };
    }

    return config;
  },
  // Add experimental features
  experimental: {
    // Enable server actions
    serverActions: true,
    // Enable optimized loading
    optimizeCss: true,
    // Enable modern build output
    modern: true,
  },
  // Add environment configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Add redirects for old routes if needed
  async redirects() {
    return [
      // Add your redirects here if needed
    ];
  },
  // Add rewrites for API proxying if needed
  async rewrites() {
    return [
      // Add your rewrites here if needed
    ];
  },
};

// Add error handling for configuration
try {
  // Validate configuration
  if (!config.images.domains.includes('www.whitehouse.gov')) {
    throw new Error('Required image domain is missing');
  }
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}

export default config;