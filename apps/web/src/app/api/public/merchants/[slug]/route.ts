import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { edgeCache, cacheKeys, cacheTTL } from '@homejiak/api/edge-cache'

// This runs on the edge
export const runtime = 'edge'
export const preferredRegion = 'sin1'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const startTime = Date.now()
  const { slug } = params
  console.log(request.url, 'Fetching merchant:', slug)

  try {
    // Check cache first
    const cacheKey = cacheKeys.merchant(slug)
    const cached = await edgeCache.get(cacheKey)
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      })
    }

    // Initialize Supabase client (edge-compatible)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!, // Service key for public data
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )

    // Fetch merchant data
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select(`
        id,
        slug,
        businessName,
        description,
        logoUrl,
        coverImageUrl,
        cuisineType,
        averageRating,
        totalReviews,
        isActive,
        operatingHours,
        location,
        minimumOrder,
        deliveryFee,
        preparationTime,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('slug', slug)
      .eq('isActive', true)
      .single()

    if (error || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { 
          status: 404,
          headers: {
            'X-Response-Time': `${Date.now() - startTime}ms`,
            'Cache-Control': 'public, s-maxage=60', // Cache 404s briefly
          },
        }
      )
    }

    // Cache the result
    await edgeCache.set(cacheKey, merchant, cacheTTL.merchant)

    return NextResponse.json(merchant, {
      headers: {
        'X-Cache': 'MISS',
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('[API] Error fetching merchant:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}