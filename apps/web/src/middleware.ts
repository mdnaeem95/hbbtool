import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getGeolocation, isVercelEdge } from '@/types/vercel'

// This runs on Vercel Edge Network globally
export const config = {
  runtime: 'edge',
  regions: ['sin1'], // Singapore region for optimal performance
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico, robots.txt, sitemap.xml
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public/|assets/).*)',
  ],
}

// Cache configuration for different route types
const CACHE_RULES = {
  public: {
    '/': { maxAge: 60, staleWhileRevalidate: 300 },
    '/merchant/:path*': { maxAge: 300, staleWhileRevalidate: 3600 },
    '/store/:path*': { maxAge: 300, staleWhileRevalidate: 3600 },
    '/track/:path*': { maxAge: 10, staleWhileRevalidate: 30 },
  },
  api: {
    '/api/public/:path*': { maxAge: 60, staleWhileRevalidate: 300 },
    '/api/trpc/:path*': { maxAge: 0, staleWhileRevalidate: 0 }, // Dynamic
  },
}

// Performance monitoring
function trackPerformance(startTime: number, pathname: string) {
  const duration = Date.now() - startTime
  if (duration > 100) {
    console.warn(`[Edge] Slow middleware execution: ${pathname} took ${duration}ms`)
  }
}

// Get cache headers for a given path
function getCacheHeaders(pathname: string): string | null {
  for (const [pattern, config] of Object.entries(CACHE_RULES.public)) {
    if (matchesPattern(pathname, pattern)) {
      return `public, s-maxage=${config.maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
    }
  }
  
  for (const [pattern, config] of Object.entries(CACHE_RULES.api)) {
    if (matchesPattern(pathname, pattern)) {
      if (config.maxAge === 0) {
        return 'no-store, must-revalidate'
      }
      return `public, s-maxage=${config.maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
    }
  }
  
  return null
}

// Simple pattern matching
function matchesPattern(pathname: string, pattern: string): boolean {
  if (pattern.includes(':path*')) {
    const basePattern = pattern.replace(':path*', '')
    return pathname.startsWith(basePattern)
  }
  return pathname === pattern
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl
  
  // Create response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add security headers (these run at the edge for all requests)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Get geolocation data using helper
  const geo = getGeolocation(request)
  
  // Add performance and location headers
  response.headers.set('X-Edge-Location', geo.region || geo.country)
  response.headers.set('X-Edge-Request-Id', crypto.randomUUID())
  response.headers.set('X-User-Country', geo.country)
  
  if (geo.city) {
    response.headers.set('X-User-City', geo.city)
  }
  
  // Add Singapore-specific optimizations
  if (geo.country === 'SG') {
    response.headers.set('X-Currency', 'SGD')
    response.headers.set('X-Timezone', 'Asia/Singapore')
    response.headers.set('X-Locale', 'en-SG')
  } else if (geo.country === 'MY') {
    response.headers.set('X-Currency', 'MYR')
    response.headers.set('X-Timezone', 'Asia/Kuala_Lumpur')
    response.headers.set('X-Locale', 'en-MY')
  }
  
  // Log if on Vercel for debugging
  if (isVercelEdge()) {
    response.headers.set('X-Edge-Runtime', 'vercel')
  }

  // Apply cache headers based on route
  const cacheHeader = getCacheHeaders(pathname)
  if (cacheHeader) {
    response.headers.set('Cache-Control', cacheHeader)
    
    // Add Vercel CDN cache control
    if (cacheHeader.includes('public')) {
      response.headers.set('CDN-Cache-Control', `public, s-maxage=3600`)
    }
  }

  // Skip auth check for static assets and public API routes
  const isStaticAsset = pathname.includes('.')
  const isPublicAPI = pathname.startsWith('/api/public')
  const isAuthCallback = pathname.startsWith('/auth/callback')
  
  if (isStaticAsset || isPublicAPI || isAuthCallback) {
    trackPerformance(startTime, pathname)
    return response
  }

  // Create Supabase client for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  // Get user session (cached at edge)
  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that don't need protection
  const publicRoutes = ['/', '/auth', '/merchant', '/store', '/track']
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) {
    // Add user context header for downstream caching decisions
    if (user) {
      response.headers.set('X-User-Context', 'authenticated')
      response.headers.set('X-User-Type', user.user_metadata?.userType || 'customer')
    } else {
      response.headers.set('X-User-Context', 'anonymous')
    }
    
    trackPerformance(startTime, pathname)
    return response
  }

  // Protected routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      
      trackPerformance(startTime, pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is a merchant
    const userType = user.user_metadata?.userType
    if (userType !== 'merchant') {
      trackPerformance(startTime, pathname)
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Add merchant context for dashboard
    response.headers.set('X-User-Context', 'merchant')
    response.headers.set('X-Merchant-Id', user.user_metadata?.merchantId || '')
  }

  // A/B Testing at the edge
  if (!request.cookies.has('ab-test-variant')) {
    const variant = Math.random() > 0.5 ? 'A' : 'B'
    response.cookies.set('ab-test-variant', variant, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    response.headers.set('X-AB-Variant', variant)
  } else {
    const variant = request.cookies.get('ab-test-variant')?.value
    if (variant) {
      response.headers.set('X-AB-Variant', variant)
    }
  }

  trackPerformance(startTime, pathname)
  return response
}