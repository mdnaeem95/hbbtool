import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Define paths that require authentication
  const merchantPaths = ['/dashboard', '/orders', '/products', '/analytics', '/settings']
  const customerAuthRequiredPaths = ['/account/orders', '/account/addresses', '/account/profile']
  
  const pathname = request.nextUrl.pathname
  
  // Check if the request is for merchant routes
  if (merchantPaths.some(path => pathname.startsWith(path))) {
    // If no user, redirect to login
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is a merchant
    if (user.user_metadata?.userType !== 'merchant') {
      // Redirect non-merchants to customer area
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Check if the request is for customer auth-required routes
  if (customerAuthRequiredPaths.some(path => pathname.startsWith(path))) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // All other customer routes (/, /browse, /cart, /checkout, etc.) are accessible without auth

  return response
}

export const config = {
  matcher: [
    // Include all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}