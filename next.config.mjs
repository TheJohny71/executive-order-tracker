/** @type {import('next').NextConfig} */
const config = {
  images: {
    domains: ['www.whitehouse.gov'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false, // Security: Remove X-Powered-By header
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
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
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // Enable tree shaking and dead code elimination
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        sideEffects: true,
        usedExports: true,
        minimize: true,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          minRemainingSize: 0,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          enforceSizeThreshold: 50000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            styles: {
              name: 'styles',
              test: /\.(css|scss)$/,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    optimisticClientCache: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    // Removed NODE_ENV from here as it's handled by Next.js
  }
};

export default config;