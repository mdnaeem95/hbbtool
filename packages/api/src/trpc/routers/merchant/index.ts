import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, merchantProcedure, publicProcedure } from '../../core'
import { postalCodeSchema, phoneSchema } from '../../../utils/validation'
import { handleDatabaseError } from '../../../utils/errors'
import { SearchService } from '../../../services/search'
import { subDays, startOfMonth, endOfMonth } from 'date-fns'

/* =========================
   Types & Schemas
   ========================= */
const dayRangeZ = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24h)'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24h)'),
  closed: z.boolean().optional(),
})

const operatingHoursZ = z
  .object({
    sunday: dayRangeZ.optional(),
    monday: dayRangeZ.optional(),
    tuesday: dayRangeZ.optional(),
    wednesday: dayRangeZ.optional(),
    thursday: dayRangeZ.optional(),
    friday: dayRangeZ.optional(),
    saturday: dayRangeZ.optional(),
  })
  .partial()
  .optional()

/* =========================
   Utils
   ========================= */
const DAY_KEY_BY_INDEX: readonly [
  'sunday','monday','tuesday','wednesday','thursday','friday','saturday'
] = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

type DayIndex = 0|1|2|3|4|5|6;
function isDayIndex(n: number): n is DayIndex {
  return n >= 0 && n <= 6;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'merchant'

async function ensureUniqueSlug(db: any, base: string, currentId?: string) {
  let slug = base
  for (let i = 0; i < 50; i++) {
    const exists = await db.merchant.findFirst({
      where: currentId ? { slug, id: { not: currentId } } : { slug },
      select: { id: true },
    })
    if (!exists) return slug
    slug = `${base}-${i + 2}`
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

function sgtNow(): Date {
  // Create a date in Singapore timezone
  const date = new Date()
  // Use Intl.DateTimeFormat to get Singapore time components
  const formatter = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = formatter.formatToParts(date)
  const dateParts: any = {}
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value
    }
  })
  
  // Create a new date with Singapore time components
  const sgDate = new Date(
    parseInt(dateParts.year),
    parseInt(dateParts.month) - 1, // Months are 0-indexed
    parseInt(dateParts.day),
    parseInt(dateParts.hour),
    parseInt(dateParts.minute),
    parseInt(dateParts.second)
  )
  
  return sgDate
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
  return (h || 0) * 60 + (m || 0)
}

function minutesNowSGT(): number {
  const now = sgtNow()
  return now.getHours() * 60 + now.getMinutes()
}

// Helper to convert Prisma Decimal to number
const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as any).toNumber()
  }
  return 0
}

/* =========================
   “Open now” helpers (SGT)
   ========================= */
function checkIfMerchantOpen(merchant: { operatingHours?: any }): boolean {
  try {
    // Return true if no operating hours (treat as always open)
    if (!merchant.operatingHours) return true
    
    // Check if operatingHours is a valid object
    if (typeof merchant.operatingHours !== 'object') return true
    
    const now = sgtNow()
    
    // Validate the date
    if (isNaN(now.getTime())) {
      console.error('Invalid date from sgtNow()')
      return true // Default to open
    }
    
    const dayIndex = now.getDay()
    
    // Extra validation
    if (!isDayIndex(dayIndex)) {
      console.error(`Invalid day index from getDay(): ${dayIndex}`)
      return true // Default to open
    }
    
    const dayKey = DAY_KEY_BY_INDEX[dayIndex]
    
    // Check if the day key exists in operating hours
    if (!merchant.operatingHours[dayKey]) return true
    
    const hours = merchant.operatingHours[dayKey]
    
    // Check if the merchant is closed on this day
    if (!hours || hours.closed) return false
    
    // If no open/close times specified, check if it has isOpen property
    if (!hours.open || !hours.close) {
      // Handle different formats of operating hours
      if ('isOpen' in hours) return hours.isOpen
      return true // Default to open if format is unclear
    }
    
    const nowMin = minutesNowSGT()
    const openMin = hhmmToMinutes(hours.open)
    const closeMin = hhmmToMinutes(hours.close)
    
    // Handle overnight hours (e.g., 22:00 - 02:00)
    if (closeMin < openMin) {
      return nowMin >= openMin || nowMin <= closeMin
    }
    
    return nowMin >= openMin && nowMin <= closeMin
  } catch (error) {
    console.error('Error checking merchant open status:', error)
    // Default to open if there's an error
    return true
  }
}

function getNextOpenTime(merchant: { operatingHours?: any }): Date | null {
  try {
    if (!merchant.operatingHours || typeof merchant.operatingHours !== 'object') return null
    
    const now = sgtNow()
    
    // Validate the date
    if (isNaN(now.getTime())) {
      console.error('Invalid date from sgtNow()')
      return null
    }
    
    const nowMin = minutesNowSGT()
    const todayIdx = now.getDay()
    
    if (!isDayIndex(todayIdx)) {
      console.error(`Invalid day index: ${todayIdx}`)
      return null
    }
    
    // Check next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkIdx = (todayIdx + dayOffset) % 7
      if (!isDayIndex(checkIdx)) continue
      
      const dayKey = DAY_KEY_BY_INDEX[checkIdx]
      const hours = merchant.operatingHours[dayKey]
      
      if (!hours || hours.closed || !hours.open) continue
      
      const [openHour, openMin] = hours.open.split(':').map(Number)
      if (isNaN(openHour) || isNaN(openMin)) continue
      
      const openDate = new Date(now)
      openDate.setDate(openDate.getDate() + dayOffset)
      openDate.setHours(openHour, openMin, 0, 0)
      
      // If this is today and we haven't reached opening time yet
      if (dayOffset === 0 && nowMin < hhmmToMinutes(hours.open)) {
        return openDate
      }
      
      // If this is a future day
      if (dayOffset > 0) {
        return openDate
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting next open time:', error)
    return null
  }
}

/* =========================
   Router
   ========================= */
export const merchantRouter = router({
  // Get merchant profile (with counts)
  get: merchantProcedure.query(async ({ ctx }) => {
    const merchant = await ctx.db.merchant.findUnique({
      where: { id: ctx.session!.user.id },
      include: {
        _count: { select: { products: true, orders: true, reviews: true } },
      },
    })
    if (!merchant) throw new TRPCError({ code: 'NOT_FOUND' })
    return merchant
  }),

  // Dashboard snapshot (current month)
  getDashboard: merchantProcedure.query(async ({ ctx }) => {
    const merchantId = ctx.session!.user.id
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)
    
    // Previous month for comparison
    const startOfPrevMonth = startOfMonth(subDays(startOfCurrentMonth, 1))
    const endOfPrevMonth = endOfMonth(subDays(startOfCurrentMonth, 1))

    const [
      merchant,
      // Current month data
      currentMonthStats,
      currentMonthRevenue,
      currentMonthCustomers,
      currentMonthProductsSold,
      // Previous month data for comparison
      prevMonthStats,
      prevMonthRevenue,
      // CORRECTED quick stats data
      allTimeCompletedOrders, // Changed: Get all completed orders for completion rate
      allTimeOrdersCount,     // Changed: Get all orders count
      avgPreparationTimeData,
      reviewsData,
      activeProductsCount,
      // Other dashboard data
      recentOrders,
      topProducts
    ] = await Promise.all([
      // Merchant info
      ctx.db.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
          email: true,
          phone: true,
          status: true
        }
      }),
      
      // Current month order stats by status
      ctx.db.order.groupBy({
        by: ['status'],
        where: { 
          merchantId, 
          createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth } 
        },
        _count: { _all: true },
      }),
      
      // Current month revenue (completed orders only)
      ctx.db.order.aggregate({
        where: { 
          merchantId, 
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        },
        _sum: { total: true },
      }),
      
      // Current month unique customers
      ctx.db.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
          customerId: { not: null },
        },
        select: { customerId: true },
        distinct: ['customerId'],
      }),
      
      // Current month products sold
      ctx.db.orderItem.aggregate({
        where: {
          order: {
            merchantId,
            createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
            status: { in: ['COMPLETED', 'DELIVERED'] },
          },
        },
        _sum: { quantity: true },
      }),
      
      // Previous month order count
      ctx.db.order.count({
        where: { 
          merchantId, 
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } 
        },
      }),
      
      // Previous month revenue
      ctx.db.order.aggregate({
        where: { 
          merchantId, 
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth }
        },
        _sum: { total: true },
      }),

      // CORRECTED QUICK STATS CALCULATIONS

      // All-time completed orders for completion rate
      ctx.db.order.count({
        where: {
          merchantId,
          status: { in: ['COMPLETED', 'DELIVERED'] }
        }
      }),

      // All-time total orders for completion rate
      ctx.db.order.count({
        where: { merchantId }
      }),

      // Average preparation time (last 30 days with actual data)
      ctx.db.$queryRaw<Array<{ avg_prep_time: number | null }>>`
        SELECT AVG(
          EXTRACT(EPOCH FROM ("readyAt" - "confirmedAt")) / 60
        ) as avg_prep_time
        FROM "Order"
        WHERE "merchantId" = ${merchantId}
          AND "readyAt" IS NOT NULL
          AND "confirmedAt" IS NOT NULL
          AND "createdAt" >= ${subDays(now, 30)}
      `,

      // Reviews data for average rating (all-time)
      ctx.db.review.aggregate({
        where: { 
          merchantId,
          isVisible: true 
        },
        _avg: { rating: true },
        _count: { rating: true }
      }),

      // CORRECTED: Active products count
      ctx.db.product.count({
        where: {
          merchantId,
          status: 'ACTIVE',
          deletedAt: null
        }
      }),
      
      // Recent orders for the dashboard table
      ctx.db.order.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { 
          customer: { select: { name: true, email: true } }, 
          items: { select: { productName: true, quantity: true } } 
        },
      }),
      
      // Top products this month
      ctx.db.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { 
          order: { 
            merchantId, 
            createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
          } 
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      })
    ])

    if (!merchant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" })
    }

    // Calculate current month totals
    const totalOrders = currentMonthStats.reduce((s, o) => s + (o._count?._all ?? 0), 0)
    const pendingOrders = currentMonthStats.find(o => o.status === 'PENDING')?._count?._all ?? 0
    const revenue = toNumber(currentMonthRevenue._sum.total)
    const totalCustomers = currentMonthCustomers.length
    const productsSold = currentMonthProductsSold._sum.quantity || 0
    
    // Calculate percentage changes
    const prevRevenue = toNumber(prevMonthRevenue._sum.total)
    const revenueChange = prevRevenue > 0 
      ? ((revenue - prevRevenue) / prevRevenue) * 100 
      : revenue > 0 ? 100 : 0
      
    const orderChange = prevMonthStats > 0 
      ? ((totalOrders - prevMonthStats) / prevMonthStats) * 100 
      : totalOrders > 0 ? 100 : 0

    // CORRECTED quick stats calculations
    const completionRate = allTimeOrdersCount > 0 
      ? (allTimeCompletedOrders / allTimeOrdersCount) * 100 
      : 0

    const avgPreparationTime = Math.max(0, avgPreparationTimeData[0]?.avg_prep_time || 0)

    const avgRating = toNumber(reviewsData._avg.rating) || 0
    const reviewCount = reviewsData._count.rating || 0

    console.log('🔍 Quick Stats Debug:', {
      allTimeOrdersCount,
      allTimeCompletedOrders,
      completionRate,
      avgPreparationTime,
      activeProductsCount,
      avgRating,
      reviewCount
    })

    return {
      merchant,
      stats: {
        // Basic stats (for backward compatibility)
        totalOrders,
        pendingOrders,
        revenue,
        
        // Enhanced analytics including corrected quick stats
        analytics: {
          revenue: {
            value: revenue,
            change: revenueChange,
            trend: revenueChange >= 0 ? 'up' as const : 'down' as const,
          },
          orders: {
            value: totalOrders,
            change: orderChange,
            trend: orderChange >= 0 ? 'up' as const : 'down' as const,
          },
          customers: {
            value: totalCustomers,
          },
          productsSold: {
            value: productsSold,
          },
          reviews: {
            value: reviewCount,
          },
          // CORRECTED quick stats
          completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
          avgPreparationTime: Math.round(avgPreparationTime),
          avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
          activeProducts: activeProductsCount,
        }
      },
      recentOrders,
      topProducts: topProducts.map(p => ({
        id: p.productId,
        name: p.productName,
        quantitySold: p._sum.quantity || 0,
        revenue: toNumber(p._sum.total),
      })),
    }
  }),

  // Update merchant profile
  update: merchantProcedure
    .input(z.object({
      businessName: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
      phone: phoneSchema.optional(),
      address: z.string().optional(),
      postalCode: postalCodeSchema.optional(),
      operatingHours: operatingHoursZ,
      deliverySettings: z.object({
        deliveryEnabled: z.boolean(),
        pickupEnabled: z.boolean(),
        deliveryFee: z.number().min(0),
        minimumOrder: z.number().min(0),
        deliveryRadius: z.number().min(1).max(20),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const id = ctx.session!.user.id
        const data: any = {}

        if (input.businessName) {
          data.businessName = input.businessName
          data.slug = await ensureUniqueSlug(ctx.db, slugify(input.businessName), id)
        }
        if (input.description !== undefined) data.description = input.description
        if (input.phone !== undefined) data.phone = input.phone
        if (input.address !== undefined) data.address = input.address
        if (input.postalCode !== undefined) data.postalCode = input.postalCode
        if (input.operatingHours !== undefined) data.operatingHours = input.operatingHours

        if (input.deliverySettings) {
          const d = input.deliverySettings
          data.deliveryEnabled = d.deliveryEnabled
          data.pickupEnabled = d.pickupEnabled
          data.deliveryFee = d.deliveryFee
          data.minimumOrder = d.minimumOrder
          data.deliveryRadius = d.deliveryRadius
        }

        const merchant = await ctx.db.merchant.update({ where: { id }, data })
        return merchant
      } catch (err) {
        handleDatabaseError(err)
      }
    }),

  // Analytics over a period
  analytics: merchantProcedure
    .input(z.object({ period: z.enum(['today', 'week', 'month', 'year']).default('month') }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      const now = new Date()
      let startDate: Date

      switch (input.period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week': {
          const d = new Date(now); d.setDate(d.getDate() - 7); startDate = d; break
        }
        case 'month': {
          const d = new Date(now); d.setMonth(d.getMonth() - 1); startDate = d; break
        }
        case 'year': {
          const d = new Date(now); d.setFullYear(d.getFullYear() - 1); startDate = d; break
        }
      }

      const [orders, revenueAgg, products, customers] = await Promise.all([
        ctx.db.order.groupBy({
          by: ['status'],
          where: { merchantId, createdAt: { gte: startDate! } },
          _count: { _all: true },
        }),
        ctx.db.order.aggregate({
          where: { merchantId, status: 'COMPLETED', createdAt: { gte: startDate! } },
          _sum: { total: true },
        }),
        ctx.db.orderItem.groupBy({
          by: ['productId'],
          where: { order: { merchantId, createdAt: { gte: startDate! } } },
          _sum: { quantity: true },
          _count: { _all: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        ctx.db.order.groupBy({
          by: ['customerId'],
          where: { merchantId, createdAt: { gte: startDate! } },
          _count: { _all: true },
        }),
      ])

      return {
        orders: {
          total: orders.reduce((sum, o) => sum + (o._count?._all ?? 0), 0),
          byStatus: orders,
        },
        revenue: revenueAgg._sum.total ? Number(revenueAgg._sum.total) : 0,
        popularProducts: products,
        uniqueCustomers: customers.length,
        period: input.period,
        startDate: startDate!,
      }
    }),

  // Public: search nearby merchants
  searchNearby: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      filters: z.object({
        cuisineType: z.array(z.string()).optional(),
        dietaryOptions: z.array(z.enum(['HALAL','VEGETARIAN','VEGAN'])).optional(),
        priceRange: z.object({
          min: z.number().min(0).optional(),
          max: z.number().min(0).optional(),
        }).optional(),
        bounds: z.object({
          north: z.number(),
          south: z.number(),
          east: z.number(),
          west: z.number(),
        }).optional(),
        userLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
        radius: z.number().min(0.5).max(20).default(5),
        deliveryOnly: z.boolean().optional(),
        pickupOnly: z.boolean().optional(),
      }).default({ radius: 5 }),
    }))
    .query(async ({ input }) => {
      const { query, filters } = input

      let searchLocation = filters.userLocation
      if (!searchLocation && filters.bounds) {
        searchLocation = {
          lat: (filters.bounds.north + filters.bounds.south) / 2,
          lng: (filters.bounds.east + filters.bounds.west) / 2,
        }
      }

      const merchants = await SearchService.searchMerchants({
        query,
        cuisineType: filters.cuisineType,
        latitude: searchLocation?.lat,
        longitude: searchLocation?.lng,
        radius: filters.radius,
        halal: filters.dietaryOptions?.includes('HALAL'),
        deliveryEnabled: filters.deliveryOnly,
        limit: 50,
      })

      let filtered = merchants
      if (filters.bounds && merchants.length) {
        filtered = merchants.filter(
          (m) =>
            m.latitude != null &&
            m.longitude != null &&
            m.latitude >= filters.bounds!.south &&
            m.latitude <= filters.bounds!.north &&
            m.longitude >= filters.bounds!.west &&
            m.longitude <= filters.bounds!.east
        )
      }

      if (filters.pickupOnly) filtered = filtered.filter((m) => m.pickupEnabled)

      if (filters.dietaryOptions?.includes('VEGETARIAN')) {
        filtered = filtered.filter((m) =>
          m.cuisineType?.some((c: string) =>
            c.toLowerCase().includes('vegetarian') || c.toLowerCase().includes('vegan')
          )
        )
      }

      const withStatus = filtered.map((m) => {
        const isOpen = checkIfMerchantOpen(m as any)
        const nextOpenTime = !isOpen ? getNextOpenTime(m as any) : null
        const distance = searchLocation
          ? SearchService.calculateDistance(searchLocation.lat, searchLocation.lng, m.latitude!, m.longitude!)
          : undefined
        return { ...m, isOpen, nextOpenTime, distance }
      })

      withStatus.sort((a: any, b: any) => {
        if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1
        if (a.distance != null && b.distance != null) return a.distance - b.distance
        if (a.rating !== b.rating !== null) return b.rating - a.rating
        return (b._count?.orders ?? 0) - (a._count?.orders ?? 0)
      })

      return {
        merchants: withStatus,
        total: withStatus.length,
        bounds: filters.bounds,
      }
    }),
})
