import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep strict mode
  reactStrictMode: true,
  
  // Enable edge runtime experiments
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: [
      '@homejiak/ui',
      '@homejiak/api',
      'lucide-react',
      'date-fns',
    ],
    // Tell Next.js to treat sharp as an external package
    serverComponentsExternalPackages: ['sharp', '@node-rs/argon2', '@node-rs/bcrypt'],
  },

  // Keep your existing transpiled packages
  transpilePackages: [
    '@homejiak/ui', 
    '@homejiak/api', 
    '@homejiak/database', 
    '@homejiak/auth',
    '@homejiak/storage'
  ],
  
  // Enhanced image optimization for edge
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.uploadthing.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },

  // Headers for edge caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Static assets - cache forever
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000',
          },
        ],
      },
      // Font files
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000',
          },
        ],
      },
      // Next.js static files
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000',
          },
        ],
      },
      // API routes - different caching strategies
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=3600',
          },
        ],
      },
    ]
  },

  // Redirect handling at the edge
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // Standalone output for better Docker/edge deployment
  output: 'standalone',

  // Environment variables to expose to the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://homejiak.com',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV,
  },

  // Webpack configuration - keep PrismaPlugin and add edge optimizations
  webpack: (config, { webpack, isServer, nextRuntime }) => {
    // Keep your existing Prisma plugin for server
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()]
      
      // Keep sharp on server
      config.externals = [...(config.externals || []), 'sharp']
    }
    
    // CRITICAL: Handle Sharp and binary files
    if (!isServer) {
      // Completely exclude sharp from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp: false,
        'sharp/lib/index.js': false,
        'sharp/lib/sharp.js': false,
        'sharp/lib/input.js': false,
        'sharp/lib/output.js': false,
        'sharp/lib/resize.js': false,
        'sharp/lib/pipeline.js': false,
        'sharp/lib/utility.js': false,
        '@prisma/client': './prisma/client',
      }
      
      // Ignore sharp completely on client side
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /sharp$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^sharp$/,
        })
      )
    }
    
    // Handle .node binary files
    config.module.rules.push({
      test: /\.node$/,
      use: [
        {
          loader: 'node-loader',
          options: {
            name: '[name].[hash].[ext]',
          },
        },
      ],
    })
    
    // Alternative: Simply ignore .node files if node-loader doesn't work
    // config.module.rules.push({
    //   test: /\.node$/,
    //   loader: 'null-loader',
    // })
    
    // Add edge runtime optimizations
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use lighter alternatives for edge runtime
        'lodash': 'lodash-es',
        // Exclude sharp from edge runtime
        sharp: false,
      }
      
      // Exclude heavy Node.js modules from edge runtime
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        sharp: false,
      }
    }

    // Ensure node externals don't include packages we want to bundle
    if (isServer && config.externals) {
      config.externals = config.externals.map((external) => {
        if (typeof external !== 'function') return external
        return async (context, callback) => {
          const resolve = await external(context, callback)
          
          // Don't externalize our monorepo packages
          if (context.request?.startsWith('@homejiak/')) {
            return callback()
          }
          
          callback(null, resolve)
        }
      })
    }

    return config
  },
  
  // Ignore TypeScript errors in production build (optional)
  typescript: {
    ignoreBuildErrors: process.env.VERCEL_ENV === 'production',
  },

  // Ignore ESLint errors in production build (optional)
  eslint: {
    ignoreDuringBuilds: process.env.VERCEL_ENV === 'production',
  },
}

export default nextConfig