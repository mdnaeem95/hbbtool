import { db, Prisma } from '@homejiak/database'

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

    // build price filter first
    const priceFilter = 
        priceMin !== undefined || priceMax !== undefined
            ? {
                ...(priceMin !== undefined ? { gte: priceMin } : {}),
                ...(priceMax !== undefined ? { gte: priceMax } : {}),
            }
            : undefined
    
    // Build search conditions
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
      ...(merchantId ? { merchantId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(priceFilter ? { price: priceFilter } : {}),
      ...(query
        ? {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { tags: { has: query.toLowerCase() } },
            ],
        }
      : {}),
    }

    // fallback ordering since _relevance is not defined
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ featured: 'desc' }]
    if (query) {
        orderBy.push({ name: 'asc' })
    } else {
        orderBy.push({ createdAt: 'desc' })
    }
    
    const products = await db.product.findMany({
      where,
      take: limit,
      orderBy,
      include: {
        merchant: { select: { businessName: true, slug: true } },
        category: { select: { name: true, slug: true, } },
      },
    })
    
    return products
  }
  
  static async searchMerchants(params: {
    query?: string
    cuisineType?: string[]
    latitude?: number
    longitude?: number
    radius?: number
    halal?: boolean
    deliveryEnabled?: boolean
    pickupEnabled?: boolean  // Add this
    bounds?: { north: number; south: number; east: number; west: number } // Add bounds
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

    // If we have bounds, use them for efficient filtering
    if (bounds && !latitude && !longitude) {
      const where: Prisma.MerchantWhereInput = {
        status: 'ACTIVE',
        deletedAt: null,
        latitude: { gte: bounds.south, lte: bounds.north },
        longitude: { gte: bounds.west, lte: bounds.east },
        ...(halal !== undefined && { halal }),
        ...(deliveryEnabled !== undefined && { deliveryEnabled }),
        ...(pickupEnabled !== undefined && { pickupEnabled }),
        ...(cuisineType?.length && { cuisineType: { hasSome: cuisineType } }),
      }

      if (query) {
        where.OR = [
          { businessName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { cuisineType: { has: query.toLowerCase() } },
        ]
      }

      const merchants = await db.merchant.findMany({
        where,
        take: limit,
        include: {
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: [
          { verified: 'desc' },
          { averageRating: 'desc' },
        ],
      })

      return merchants
    }

    // If we have coordinates, use raw SQL for distance calculation
    if (latitude && longitude) {
      const queryConditions = []
      const queryParams: any[] = [latitude, latitude, longitude, latitude]
      let paramIndex = 5

      queryConditions.push(`m.status = 'ACTIVE'`)
      queryConditions.push(`m."deletedAt" IS NULL`)
      queryConditions.push(`m.latitude IS NOT NULL`)
      queryConditions.push(`m.longitude IS NOT NULL`)

      if (halal !== undefined) {
        queryConditions.push(`m.halal = $${paramIndex}`)
        queryParams.push(halal)
        paramIndex++
      }

      if (deliveryEnabled !== undefined) {
        queryConditions.push(`m."deliveryEnabled" = $${paramIndex}`)
        queryParams.push(deliveryEnabled)
        paramIndex++
      }

      if (pickupEnabled !== undefined) {
        queryConditions.push(`m."pickupEnabled" = $${paramIndex}`)
        queryParams.push(pickupEnabled)
        paramIndex++
      }

      if (cuisineType?.length) {
        queryConditions.push(`m."cuisineType" && $${paramIndex}::text[]`)
        queryParams.push(cuisineType)
        paramIndex++
      }

      if (query) {
        queryConditions.push(`(
          m."businessName" ILIKE $${paramIndex} OR 
          m.description ILIKE $${paramIndex} OR
          $${paramIndex + 1} = ANY(m."cuisineType")
        )`)
        queryParams.push(`%${query}%`, query.toLowerCase())
        paramIndex += 2
      }

      // Add radius to params
      queryParams.push(radius)
      queryParams.push(limit)

      const merchants = await db.$queryRawUnsafe<any[]>(`
        SELECT 
          m.*,
          (
            6371 * acos(
              cos(radians($1)) * 
              cos(radians(m.latitude)) * 
              cos(radians(m.longitude) - radians($3)) + 
              sin(radians($2)) * 
              sin(radians(m.latitude))
            )
          ) AS distance,
          COUNT(DISTINCT o.id) as "orderCount"
        FROM "Merchant" m
        LEFT JOIN "Order" o ON o."merchantId" = m.id
        WHERE ${queryConditions.join(' AND ')}
        GROUP BY m.id
        HAVING (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(m.latitude)) * 
            cos(radians(m.longitude) - radians($3)) + 
            sin(radians($4)) * 
            sin(radians(m.latitude))
          )
        ) <= $${paramIndex}
        ORDER BY 
          m.verified DESC,
          distance ASC,
          m."averageRating" DESC NULLS LAST
        LIMIT $${paramIndex + 1}
      `, ...queryParams)

      // Format the response to match expected structure
      return merchants.map(m => ({
        ...m,
        _count: { orders: m.orderCount || 0, reviews: m.reviewCount || 0 },
        rating: m.averageRating,
      }))
    }

    // Fallback to original logic if no location data
    const where: Prisma.MerchantWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
      ...(halal !== undefined && { halal }),
      ...(deliveryEnabled !== undefined && { deliveryEnabled }),
      ...(pickupEnabled !== undefined && { pickupEnabled }),
      ...(cuisineType?.length && { cuisineType: { hasSome: cuisineType } }),
    }

    if (query) {
      where.OR = [
        { businessName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { cuisineType: { has: query.toLowerCase() } },
      ]
    }

    const merchants = await db.merchant.findMany({
      where,
      take: limit,
      include: {
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy: [
        { verified: 'desc' },
        { averageRating: 'desc' },
      ],
    })

    return merchants
  }
  
  static async getSuggestions(params: {
    query: string
    type: 'product' | 'merchant' | 'all'
    limit?: number
  }) {
    const { query, type, limit = 5 } = params
    const suggestions: any[] = []
    
    if (type === 'product' || type === 'all') {
      const products = await db.product.findMany({
        where: {
          status: 'ACTIVE',
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: limit,
      })
      
      suggestions.push(
        ...products.map(p => ({
          type: 'product',
          id: p.id,
          text: p.name,
          slug: p.slug,
        }))
      )
    }
    
    if (type === 'merchant' || type === 'all') {
      const merchants = await db.merchant.findMany({
        where: {
          status: 'ACTIVE',
          businessName: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          businessName: true,
          slug: true,
        },
        take: limit,
      })
      
      suggestions.push(
        ...merchants.map(m => ({
          type: 'merchant',
          id: m.id,
          text: m.businessName,
          slug: m.slug,
        }))
      )
    }
    
    return suggestions.slice(0, limit)
  }
  
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
  }
  
  static toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}