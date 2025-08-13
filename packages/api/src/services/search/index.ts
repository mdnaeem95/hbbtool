import { db, Prisma } from '@kitchencloud/database'

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
      limit = 20,
    } = params
    
    let where: Prisma.MerchantWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
      ...(halal !== undefined && { halal }),
      ...(deliveryEnabled !== undefined && { deliveryEnabled }),
      ...(cuisineType && cuisineType.length > 0 && {
        cuisineType: { hasSome: cuisineType },
      }),
    }
    
    // Text search
    if (query) {
      where.OR = [
        { businessName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { cuisineType: { has: query.toLowerCase() } },
      ]
    }
    
    // Get initial results
    let merchants = await db.merchant.findMany({
      where,
      take: limit * 2, // Get more for distance filtering
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          },
        },
      },
    })
    
    // Filter by distance if location provided
    if (latitude && longitude) {
      merchants = merchants.filter(merchant => {
        if (!merchant.latitude || !merchant.longitude) return false
        
        const distance = this.calculateDistance(
          latitude,
          longitude,
          merchant.latitude,
          merchant.longitude
        )
        
        return distance <= radius
      })
    }
    
    // Sort by relevance/popularity
    merchants.sort((a, b) => {
      // Prioritize verified merchants
      if (a.verified !== b.verified) {
        return a.verified ? -1 : 1
      }
      
      // Then by order count
      return b._count.orders - a._count.orders
    })
    
    return merchants.slice(0, limit)
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
  
  private static calculateDistance(
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
  
  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}