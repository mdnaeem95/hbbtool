import { db, Prisma } from "@homejiak/database"
import { sql } from "@homejiak/database/postgres" 
import { cacheTTL, edgeCache } from "../../utils/edge-cache"

export interface NearbyMerchant {
  id: string
  businessName: string
  slug: string
  latitude: number
  longitude: number
  halal: boolean
  deliveryEnabled: boolean
  pickupEnabled: boolean
  averageRating: number | null
  verified: boolean
  distance: number
}

// Helper function to check if merchant is open
function isRestaurantOpen(operatingHours: any): boolean {
  if (!operatingHours) return true // Assume open if no hours specified
  
  const now = new Date()
  const sgTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Singapore" }))
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[sgTime.getDay()]
  const currentTime = sgTime.getHours() * 60 + sgTime.getMinutes()
  
  const todayHours = operatingHours[currentDay!]
  if (!todayHours) return false
  if (todayHours.closed) return false
  
  const [openHour, openMin] = todayHours.open.split(':').map(Number)
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number)
  const openTime = openHour * 60 + openMin
  const closeTime = closeHour * 60 + closeMin
  
  return currentTime >= openTime && currentTime <= closeTime
}

// Calculate distance in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export class SearchService {
  static async searchProducts(params: {
    query: string
    merchantId?: string
    categoryId?: string
    priceMin?: number
    priceMax?: number
    limit?: number
  }) {
    const { query, merchantId, categoryId, priceMin, priceMax, limit = 20 } = params

    const priceFilter =
      priceMin !== undefined || priceMax !== undefined
        ? {
            ...(priceMin !== undefined ? { gte: priceMin } : {}),
            ...(priceMax !== undefined ? { lte: priceMax } : {}),
          }
        : undefined

    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
      deletedAt: null,
      ...(merchantId ? { merchantId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(priceFilter ? { price: priceFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { tags: { has: query.toLowerCase() } },
            ],
          }
        : {}),
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ featured: "desc" }]
    if (query) orderBy.push({ name: "asc" })
    else orderBy.push({ createdAt: "desc" })

    return db.product.findMany({
      where,
      take: limit,
      orderBy,
      include: {
        merchant: { select: { businessName: true, slug: true } },
        category: { select: { name: true, slug: true } },
      },
    })
  }

  static async searchMerchants(params: {
    query?: string
    cuisineType?: string[]
    latitude?: number
    longitude?: number
    radius?: number // in meters now!
    halal?: boolean
    deliveryEnabled?: boolean
    pickupEnabled?: boolean
    bounds?: { north: number; south: number; east: number; west: number }
    limit?: number
  }) {
    const {
      query,
      cuisineType,
      latitude,
      longitude,
      radius = 5000, // Default 5km in meters
      halal,
      deliveryEnabled,
      pickupEnabled,
      bounds,
      limit = 20,
    } = params

    // Build cache key
    const cacheKey = [
      "searchMerchants",
      query || "",
      cuisineType?.join(",") || "",
      latitude?.toFixed(4) || "",
      longitude?.toFixed(4) || "",
      radius,
      halal !== undefined ? `halal:${halal}` : "",
      deliveryEnabled !== undefined ? `delivery:${deliveryEnabled}` : "",
      pickupEnabled !== undefined ? `pickup:${pickupEnabled}` : "",
      bounds ? `bounds:${bounds.north.toFixed(4)}:${bounds.south.toFixed(4)}:${bounds.east.toFixed(4)}:${bounds.west.toFixed(4)}` : "",
      limit,
    ].filter(Boolean).join("|")

    return edgeCache.getOrSet(cacheKey, async () => {
      // Common select fields for all queries
      const selectFields = {
        id: true,
        businessName: true,
        slug: true,
        logoUrl: true,
        description: true,
        cuisineType: true,
        latitude: true,
        longitude: true,
        halal: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: true,
        minimumOrder: true,
        preparationTime: true,
        averageRating: true,
        totalReviews: true,
        verified: true,
        operatingHours: true,
        address: true,
        postalCode: true,
        status: true,
      }

      let merchants: any[] = []

      // If we have coordinates, use PostGIS for distance calculation
      if (latitude && longitude && !bounds) {
        const rawResults = await db.$queryRaw<any[]>`
          SELECT 
            m.id, 
            m."businessName", 
            m.slug,
            m."logoUrl",
            m.description,
            m."cuisineType",
            m.latitude, 
            m.longitude,
            m.halal, 
            m."deliveryEnabled", 
            m."pickupEnabled",
            m."deliveryFee",
            m."minimumOrder",
            m."preparationTime",
            m."averageRating",
            m."totalReviews",
            m.verified,
            m."operatingHours",
            m.address,
            m."postalCode",
            m.status,
            ST_Distance(
              m.location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
            ) AS distance
          FROM "Merchant" m
          WHERE m.status = 'ACTIVE'
            AND m."deletedAt" IS NULL
            ${halal !== undefined ? `AND m.halal = ${halal}` : ''}
            ${deliveryEnabled !== undefined ? `AND m."deliveryEnabled" = ${deliveryEnabled}` : ''}
            ${pickupEnabled !== undefined ? `AND m."pickupEnabled" = ${pickupEnabled}` : ''}
            ${cuisineType?.length ? `AND m."cuisineType" && ARRAY[${cuisineType.map(c => `'${c}'`).join(',')}]` : ''}
            ${query ? `AND (
              m."businessName" ILIKE '%${query}%' OR
              m.description ILIKE '%${query}%'
            )` : ''}
            AND ST_DWithin(
              m.location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              ${radius}
            )
          ORDER BY m.verified DESC, distance ASC, m."averageRating" DESC NULLS LAST
          LIMIT ${limit};
        `

        merchants = rawResults.map(m => ({
          ...m,
          // Rename averageRating to rating for consistency
          rating: m.averageRating,
          reviewCount: m.totalReviews, 
          // Calculate isOpen status
          isOpen: isRestaurantOpen(m.operatingHours),
        }))
      } 
      // Bounds-only query
      else if (bounds) {
        const where: any = {
          status: 'ACTIVE',
          deletedAt: null,
          latitude: { gte: bounds.south, lte: bounds.north },
          longitude: { gte: bounds.west, lte: bounds.east },
          ...(halal !== undefined && { halal }),
          ...(deliveryEnabled !== undefined && { deliveryEnabled }),
          ...(pickupEnabled !== undefined && { pickupEnabled }),
          ...(cuisineType?.length && { cuisineType: { hasSome: cuisineType } }),
          ...(query && {
            OR: [
              { businessName: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }),
        }

        const dbResults = await db.merchant.findMany({
          where,
          take: limit,
          orderBy: [{ verified: "desc" }, { averageRating: "desc" }],
          select: selectFields,
        })

        // Calculate distance if we have a center point
        const centerLat = latitude || (bounds.north + bounds.south) / 2
        const centerLng = longitude || (bounds.east + bounds.west) / 2

        merchants = dbResults.map(m => ({
          ...m,
          // Rename averageRating to rating
          rating: m.averageRating,
          reviewCount: m.totalReviews, 
          // Calculate distance from center
          distance: m.latitude && m.longitude 
            ? calculateDistance(centerLat, centerLng, m.latitude, m.longitude)
            : undefined,
          // Calculate isOpen status
          isOpen: isRestaurantOpen(m.operatingHours),
        }))

        // Sort by distance if available
        merchants.sort((a, b) => {
          if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance
          }
          return 0
        })
      }
      // Fallback query without location
      else {
        const where: any = {
          status: 'ACTIVE',
          deletedAt: null,
          ...(halal !== undefined && { halal }),
          ...(deliveryEnabled !== undefined && { deliveryEnabled }),
          ...(pickupEnabled !== undefined && { pickupEnabled }),
          ...(cuisineType?.length && { cuisineType: { hasSome: cuisineType } }),
          ...(query && {
            OR: [
              { businessName: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }),
        }

        const dbResults = await db.merchant.findMany({
          where,
          take: limit,
          orderBy: [{ verified: "desc" }, { averageRating: "desc" }],
          select: selectFields,
        })

        merchants = dbResults.map(m => ({
          ...m,
          // Rename averageRating to rating
          rating: m.averageRating,
          reviewCount: m.totalReviews,  
          // No distance without coordinates
          distance: undefined,
          // Calculate isOpen status
          isOpen: isRestaurantOpen(m.operatingHours),
        }))
      }

      return merchants
    }, cacheTTL.merchant)
  }

  static async rawNearbyMerchants(params: {
    latitude: number
    longitude: number
    radiusMeters: number
    limit: number
  }) {
    const { latitude, longitude, radiusMeters, limit } = params

    return sql/*sql*/`
      SELECT id, "businessName", slug,
             latitude, longitude, halal,
             "deliveryEnabled", "pickupEnabled",
             "averageRating", verified,
             ST_Distance(
               location,
               ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
             ) AS distance
      FROM "Merchant"
      WHERE status = 'ACTIVE'
        AND "deletedAt" IS NULL
        AND ST_DWithin(
              location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              ${radiusMeters}
            )
      ORDER BY verified DESC, distance ASC, "averageRating" DESC NULLS LAST
      LIMIT ${limit};
    `
  }

  static async getSuggestions(params: {
    query: string
    type: "product" | "merchant" | "all"
    limit?: number
  }) {
    const { query, type, limit = 5 } = params
    const suggestions: any[] = []

    if (type === "product" || type === "all") {
      const products = await db.product.findMany({
        where: { status: "ACTIVE", name: { contains: query, mode: "insensitive" } },
        select: { id: true, name: true, slug: true },
        take: limit,
      })
      suggestions.push(
        ...products.map((p) => ({ type: "product", id: p.id, text: p.name, slug: p.slug })),
      )
    }

    if (type === "merchant" || type === "all") {
      const merchants = await db.merchant.findMany({
        where: { status: "ACTIVE", businessName: { contains: query, mode: "insensitive" } },
        select: { id: true, businessName: true, slug: true },
        take: limit,
      })
      suggestions.push(
        ...merchants.map((m) => ({ type: "merchant", id: m.id, text: m.businessName, slug: m.slug })),
      )
    }

    return suggestions.slice(0, limit)
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) ** 2

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  static toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}