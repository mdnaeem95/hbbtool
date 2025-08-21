import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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
            response = NextResponse.next({
              request,
            })
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes that don't need protection
  const publicRoutes = [
    '/',
    '/auth',
    '/merchant',
    '/api',
    '/_next',
    '/favicon.ico',
  ]

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) {
    return response
  }

  // Merchant routes protection
  if (pathname.startsWith('/dashboard')) {
    if (!user || user.user_metadata?.userType !== 'merchant') {
      return NextResponse.redirect(
        new URL(`/auth?type=merchant&redirect=${pathname}`, request.url)
      )
    }
  }

  // Customer account routes (optional auth)
  // Note: Customer auth is handled client-side with session tokens
  // This middleware only protects Supabase-authenticated routes

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that should be public
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/webhook).*)',
  ],
}