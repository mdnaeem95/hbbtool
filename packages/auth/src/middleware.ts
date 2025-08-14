import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PREFIXES = [
  '/_next', '/favicon', '/assets', '/images', '/api/public',
  '/auth', '/oauth', '/supabase' // auth callbacks / status endpoints
]

const isPublic = (path: string) =>
  PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))

export async function middleware(request: NextRequest) {
  // Bypass static & public routes
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next()

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isMerchant = !!user && user.user_metadata?.userType === 'merchant'

  const { pathname } = request.nextUrl

  // Protect merchant app
  if (pathname.startsWith('/merchant')) {
    if (!isMerchant) {
      const url = new URL('/merchant/login', request.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect generic account pages (if you have them)
  if (pathname.startsWith('/account') && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
      Run on all app routes except the file system assets by default.
      You already guard via PUBLIC_PREFIXES above, this keeps cost lower.
    */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
