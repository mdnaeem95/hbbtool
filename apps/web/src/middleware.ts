// apps/web/middleware.ts
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export function isVercelEdge(): boolean {
  return process.env.VERCEL_ENV !== undefined
}

export function getGeolocation(request: NextRequest): {
  country: string
  region: string
  city: string
  latitude?: string
  longitude?: string
} {
  const fromHeaders = {
    country: request.headers.get("x-vercel-ip-country") || "",
    region: request.headers.get("x-vercel-ip-country-region") || "",
    city: request.headers.get("x-vercel-ip-city") || "",
    latitude: request.headers.get("x-vercel-ip-latitude") || undefined,
    longitude: request.headers.get("x-vercel-ip-longitude") || undefined,
  }

  if (process.env.NODE_ENV === "development") {
    return {
      country: "SG",
      region: "Singapore",
      city: "Singapore",
      latitude: "1.3521",
      longitude: "103.8198",
    }
  }

  return {
    country: fromHeaders.country || "SG",
    region: fromHeaders.region || "",
    city: fromHeaders.city || "",
    latitude: fromHeaders.latitude,
    longitude: fromHeaders.longitude,
  }
}

export const config = {
  runtime: "experimental-edge",
  regions: ["sin1"], // Singapore edge region
  matcher: [
    "/dashboard/:path*",
    "/merchant/:path*",
    "/store/:path*",
    "/track/:path*",
    "/api/trpc/:path*",
    "/api/public/:path*",
  ],
}

// Cache rules
const CACHE_RULES = {
  public: {
    "/": { maxAge: 60, staleWhileRevalidate: 300 },
    "/merchant/:path*": { maxAge: 300, staleWhileRevalidate: 3600 },
    "/store/:path*": { maxAge: 300, staleWhileRevalidate: 3600 },
    "/track/:path*": { maxAge: 10, staleWhileRevalidate: 30 },
  },
  api: {
    "/api/public/:path*": { maxAge: 60, staleWhileRevalidate: 300 },
    "/api/trpc/:path*": { maxAge: 0, staleWhileRevalidate: 0 },
  },
}

function matchesPattern(pathname: string, pattern: string): boolean {
  if (pattern.includes(":path*")) {
    const base = pattern.replace(":path*", "")
    return pathname.startsWith(base)
  }
  return pathname === pattern
}

function getCacheHeaders(pathname: string): string | null {
  for (const [pattern, cfg] of Object.entries(CACHE_RULES.public)) {
    if (matchesPattern(pathname, pattern)) {
      return `public, s-maxage=${cfg.maxAge}, stale-while-revalidate=${cfg.staleWhileRevalidate}`
    }
  }
  for (const [pattern, cfg] of Object.entries(CACHE_RULES.api)) {
    if (matchesPattern(pathname, pattern)) {
      return cfg.maxAge === 0
        ? "no-store, must-revalidate"
        : `public, s-maxage=${cfg.maxAge}, stale-while-revalidate=${cfg.staleWhileRevalidate}`
    }
  }
  return null
}

const AUTH_REQUIRED = ["/dashboard"]

export async function middleware(request: NextRequest) {
  const start = Date.now()
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Security headers
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "origin-when-cross-origin")

  // Geolocation headers
  const geo = getGeolocation(request)
  response.headers.set("X-Edge-Location", geo.region || geo.country)
  response.headers.set("X-Edge-Request-Id", crypto.randomUUID())
  response.headers.set("X-User-Country", geo.country)
  if (geo.city) response.headers.set("X-User-City", geo.city)

  if (geo.country === "SG") {
    response.headers.set("X-Currency", "SGD")
    response.headers.set("X-Timezone", "Asia/Singapore")
    response.headers.set("X-Locale", "en-SG")
  } else if (geo.country === "MY") {
    response.headers.set("X-Currency", "MYR")
    response.headers.set("X-Timezone", "Asia/Kuala_Lumpur")
    response.headers.set("X-Locale", "en-MY")
  }

  if (isVercelEdge()) response.headers.set("X-Edge-Runtime", "vercel")

  // Cache headers
  const cacheHeader = getCacheHeaders(pathname)
  if (cacheHeader) {
    response.headers.set("Cache-Control", cacheHeader)
    if (cacheHeader.includes("public")) {
      response.headers.set("CDN-Cache-Control", "public, s-maxage=3600")
    }
  }

  // Public routes (no auth)
  const publicRoutes = ["/", "/auth", "/track", "/api/public", "/merchant"]
  const isPublic = publicRoutes.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  )
  if (isPublic || pathname.includes(".")) {
    const duration = Date.now() - start
    if (duration > 300) {
      console.warn(`[Edge] Slow middleware: ${pathname} took ${duration}ms`)
    }
    return response
  }

  // Auth only if required
  if (AUTH_REQUIRED.some((p) => pathname.startsWith(p))) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) =>
            cookies.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            ),
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = new URL("/auth", request.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (pathname.startsWith("/dashboard") && user.user_metadata?.userType !== "merchant") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    response.headers.set("X-User-Context", user.user_metadata?.userType || "customer")
    if (user.user_metadata?.merchantId) {
      response.headers.set("X-Merchant-Id", user.user_metadata.merchantId)
    }
  }

  // A/B test variant
  if (!request.cookies.has("ab-test-variant")) {
    const variant = Math.random() > 0.5 ? "A" : "B"
    response.cookies.set("ab-test-variant", variant, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    response.headers.set("X-AB-Variant", variant)
  } else {
    const variant = request.cookies.get("ab-test-variant")?.value
    if (variant) response.headers.set("X-AB-Variant", variant)
  }

  // Performance log
  const duration = Date.now() - start
  if (duration > 300) {
    console.warn(`[Edge] Slow middleware: ${pathname} took ${duration}ms`)
  }

  return response
}
