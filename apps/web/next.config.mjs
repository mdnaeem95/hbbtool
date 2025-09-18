import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'
/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  
  transpilePackages: ['@kitchencloud/ui', '@kitchencloud/api', '@kitchencloud/database', '@kitchencloud/auth'],
  
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'picsum.photos' }
    ],
  },
  
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()]
    }
    return config
  },
}

export default nextConfig