// trpc/routers/merchant.ts
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, merchantProcedure, publicProcedure } from '../../core'
import { postalCodeSchema, phoneSchema } from '../../../utils/validation'
import { handleDatabaseError } from '../../../utils/errors'
import { SearchService } from '../../../services/search'

/* =========================
   Types & Schemas
   ========================= */
type DayKey =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

type DayRange = { open: string; close: string; closed?: boolean }
type OperatingHours = Partial<Record<DayKey, DayRange>>

function toDayIndex(n: number): DayIndex {
  const x = n % 7;
  return (x < 0 ? (x + 7) : x) as DayIndex;
}

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
  return new Date(new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }))
}

function sgtDayKey(date: Date = sgtNow()): DayKey {
  const i = date.getDay();
  if (!isDayIndex(i)) throw new Error(`Invalid day index: ${i}`);
  return DAY_KEY_BY_INDEX[i]; // ✅ now typed as DayKey, not DayKey | undefined
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
  return (h || 0) * 60 + (m || 0)
}

function minutesNowSGT(): number {
  const now = sgtNow()
  return now.getHours() * 60 + now.getMinutes()
}

/* =========================
   “Open now” helpers (SGT)
   ========================= */
function checkIfMerchantOpen(merchant: { operatingHours?: OperatingHours | null }): boolean {
  if (!merchant.operatingHours) return true // treat as always open if unset
  const today = sgtDayKey()
  const hours = merchant.operatingHours?.[today]
  if (!hours || hours.closed) return false
  const nowMin = minutesNowSGT()
  return nowMin >= hhmmToMinutes(hours.open) && nowMin <= hhmmToMinutes(hours.close)
}

function getNextOpenTime(merchant: { operatingHours?: OperatingHours | null }): Date | null {
  if (!merchant.operatingHours) return null
  const now = sgtNow()
  const nowMin = minutesNowSGT()
  const todayIdx = toDayIndex(now.getDay())

  for (let offset = 0 as DayIndex; offset < 7; offset = toDayIndex(offset + 1)) {
    const idx = toDayIndex(todayIdx + offset);
    const dayKey = DAY_KEY_BY_INDEX[idx]
    const hours = merchant.operatingHours?.[dayKey]
    if (!hours || hours.closed) continue

    const openDate = sgtNow()
    openDate.setDate(openDate.getDate() + offset)
    const [oh, om] = hours.open.split(':').map(Number)
    openDate.setHours(oh || 0, om || 0, 0, 0)

    if (offset === 0) {
      if (nowMin < hhmmToMinutes(hours.open)) return openDate
    } else {
      return openDate
    }
  }
  return null
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [ordersByStatus, revenueAgg, recentOrders, topProducts] = await Promise.all([
      ctx.db.order.groupBy({
        by: ['status'],
        where: { merchantId, createdAt: { gte: startOfMonth } },
        _count: { _all: true },
      }),
      ctx.db.order.aggregate({
        where: { merchantId, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      ctx.db.order.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: true, items: true },
      }),
      ctx.db.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { order: { merchantId, createdAt: { gte: startOfMonth } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ])

    const totalOrders = ordersByStatus.reduce((s, o) => s + (o._count?._all ?? 0), 0)
    const pendingOrders = ordersByStatus.find(o => o.status === 'PENDING')?._count?._all ?? 0
    const revenue = revenueAgg._sum.total ? Number(revenueAgg._sum.total) : 0

    return {
      merchantId,
      stats: { totalOrders, pendingOrders, revenue },
      ordersByStatus,
      recentOrders,
      topProducts,
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
        return (b._count?.orders ?? 0) - (a._count?.orders ?? 0)
      })

      return {
        merchants: withStatus,
        total: withStatus.length,
        bounds: filters.bounds,
      }
    }),
})
