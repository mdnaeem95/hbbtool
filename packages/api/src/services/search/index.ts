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
    radius?: number // in km
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
      radius = 5,
      halal,
      deliveryEnabled,
      pickupEnabled,
      bounds,
      limit = 20,
    } = params

    // 🔑 Build a cache key unique to this search
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
      bounds
        ? `bounds:${bounds.north.toFixed(4)}:${bounds.south.toFixed(4)}:${bounds.east.toFixed(
            4
          )}:${bounds.west.toFixed(4)}`
        : "",
      limit,
    ]
      .filter(Boolean)
      .join("|")

    return edgeCache.getOrSet(cacheKey, async () => {
      // 📍 Bounds-only query (no lat/lng provided)
      if (bounds && !latitude && !longitude) {
        return db.merchant.findMany({
          where: {
            status: "ACTIVE",
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
                { cuisineType: { has: query.toLowerCase() } },
              ],
            }),
          },
          take: limit,
          orderBy: [{ verified: "desc" }, { averageRating: "desc" }],
          select: {
            id: true,
            businessName: true,
            slug: true,
            latitude: true,
            longitude: true,
            halal: true,
            deliveryEnabled: true,
            pickupEnabled: true,
            averageRating: true,
            verified: true,
          },
        })
      }

      // 📍 Coordinates query (fast PostGIS distance search)
      if (latitude && longitude) {
        const radiusMeters = radius * 1000

        return db.$queryRaw<any[]>`
          SELECT m.id, m."businessName", m.slug,
                 m.latitude, m.longitude,
                 m.halal, m."deliveryEnabled", m."pickupEnabled",
                 m."averageRating", m.verified,
                 ST_Distance(
                   m.location,
                   ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
                 ) AS distance
          FROM "Merchant" m
          WHERE m.status = 'ACTIVE'
            AND m."deletedAt" IS NULL
            AND ST_DWithin(
                  m.location,
                  ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
                  ${radiusMeters}
                )
          ORDER BY m.verified DESC,
                   distance ASC,
                   m."averageRating" DESC NULLS LAST
          LIMIT ${limit};
        `
      }

      // 📍 Fallback (no bounds, no coords)
      return db.merchant.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          ...(halal !== undefined && { halal }),
          ...(deliveryEnabled !== undefined && { deliveryEnabled }),
          ...(pickupEnabled !== undefined && { pickupEnabled }),
          ...(cuisineType?.length && { cuisineType: { hasSome: cuisineType } }),
          ...(query && {
            OR: [
              { businessName: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { cuisineType: { has: query.toLowerCase() } },
            ],
          }),
        },
        take: limit,
        orderBy: [{ verified: "desc" }, { averageRating: "desc" }],
        select: {
          id: true,
          businessName: true,
          slug: true,
          latitude: true,
          longitude: true,
          halal: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          averageRating: true,
          verified: true,
        },
      })
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
