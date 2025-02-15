/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': './src',
      }
      return config
    },
    experimental: {
      serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
      esmExternals: 'loose'
    }
  }
  
  export default nextConfig