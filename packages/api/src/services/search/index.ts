// services/search/index.ts
import { db, Prisma } from "@homejiak/database"

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
    radius?: number
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

    // Bounds query
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

    // Coordinates query (optimized raw SQL)
    if (latitude && longitude) {
      return db.$queryRawUnsafe<any[]>(
        `
        WITH base AS (
          SELECT 
            m.id, m."businessName", m.slug,
            m.latitude, m.longitude,
            m.halal, m."deliveryEnabled", m."pickupEnabled",
            m."averageRating", m.verified,
            6371 * acos(
              cos(radians($1)) * cos(radians(m.latitude)) *
              cos(radians(m.longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(m.latitude))
            ) AS distance
          FROM "Merchant" m
          WHERE m.status = 'ACTIVE' AND m."deletedAt" IS NULL
        )
        SELECT * FROM base
        WHERE distance <= $3
        ORDER BY verified DESC, distance ASC, "averageRating" DESC NULLS LAST
        LIMIT $4
        `,
        latitude,
        longitude,
        radius,
        limit,
      )
    }

    // Fallback (no bounds, no coords)
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
