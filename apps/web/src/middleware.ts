import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Merchant routes protection
  if (pathname.startsWith('/dashboard')) {
    if (!user || user.user_metadata?.userType !== 'merchant') {
      return NextResponse.redirect(new URL('/auth?redirect=' + pathname, request.url))
    }
  }

  // Customer account routes (optional auth)
  if (pathname.startsWith('/account')) {
    if (!user) {
      // For customers, we check localStorage token on client side
      // Server just passes through
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}