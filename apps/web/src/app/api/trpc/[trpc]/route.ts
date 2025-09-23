import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter, createTRPCContext } from '@homejiak/api'
import { NextRequest } from 'next/server'

// Run on Vercel Edge Runtime
export const runtime = 'edge'
export const preferredRegion = 'sin1' // Singapore region

// Define which paths should be cached
const CACHE_CONFIG = {
  'public.getMerchant': { revalidate: 300 },
  'public.listProducts': { revalidate: 60 },
  'public.getCategories': { revalidate: 3600 },
  'public.getProduct': { revalidate: 300 },
} as const

// Helper to determine if a path should be cached
function getCacheConfig(path: string | undefined) {
  if (!path) return null
  
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (path.startsWith(pattern)) {
      return config
    }
  }
  
  return null
}

const handler = async (req: NextRequest) => {
  // Extract the procedure path from the URL
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const procedurePath = pathSegments[pathSegments.length - 1]
  
  // Performance tracking
  const startTime = Date.now()

  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    responseMeta({ ctx, paths, type, errors }) {
      const duration = Date.now() - startTime
      const headers = new Headers()
      
      // Add performance header
      headers.set('X-Response-Time', `${duration}ms`)
      headers.set('X-Edge-Runtime', 'true')
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`[Edge tRPC] Slow request: ${paths?.join(',')} took ${duration}ms for context:`, ctx)
      }
      
      // Handle caching for public procedures
      const allPublic = paths?.every(path => path.startsWith('public'))
      const hasErrors = errors.length > 0
      
      if (allPublic && !hasErrors) {
        // Check if this specific path should be cached
        const cacheConfig = getCacheConfig(procedurePath)
        
        if (cacheConfig) {
          headers.set(
            'Cache-Control',
            `public, s-maxage=${cacheConfig.revalidate}, stale-while-revalidate=${cacheConfig.revalidate * 2}`
          )
          headers.set(
            'CDN-Cache-Control',
            `public, s-maxage=${cacheConfig.revalidate * 10}`
          )
        } else {
          // Default cache for public routes
          headers.set(
            'Cache-Control',
            'public, s-maxage=60, stale-while-revalidate=300'
          )
        }
      } else if (type === 'query' && !hasErrors) {
        // Private queries can have shorter cache
        headers.set(
          'Cache-Control',
          'private, max-age=10, stale-while-revalidate=30'
        )
      } else {
        // Mutations and errors should not be cached
        headers.set('Cache-Control', 'no-store, must-revalidate')
      }
      
      // CORS headers for API access
      headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      return { headers }
    },
    onError({ error, type, path, input }) {
      console.error(`[tRPC Error] ${type} ${path}:`, {
        code: error.code,
        message: error.message,
        input: type === 'mutation' ? '[REDACTED]' : input,
      })
      
      // Send to Sentry in production
      if (process.env.NODE_ENV === 'production') {
        // Edge-compatible error tracking
        fetch('https://sentry.io/api/...', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: error.message,
            code: error.code,
            path,
            type,
          }),
        }).catch(() => {
          // Fail silently - don't block the response
        })
      }
    },
  })

  return response
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  console.log('Handling CORS preflight request', request.url)
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-TRPC-Source',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}

export { handler as GET, handler as POST }