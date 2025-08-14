import { z } from 'zod'
import { router, merchantProcedure, publicProcedure } from '../../trpc'
import { postalCodeSchema, phoneSchema } from '../../utils/validation'
import { handleDatabaseError } from '../../utils/errors'
import { TRPCError } from '@trpc/server'
import { SearchService } from '../../services/search'

export const merchantRouter = router({
  // Get merchant profile
  get: merchantProcedure
    .query(async ({ ctx }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: ctx.session?.user.id },
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
      
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      return merchant
    }),

  getDashboard: merchantProcedure
  .query(async ({ ctx }) => {
    const merchantId = ctx.session?.user.id
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const [orders, revenue, recentOrders, topProducts] = await Promise.all([
      // Order stats
      ctx.db.order.groupBy({
        by: ['status'],
        where: {
          merchantId,
          createdAt: { gte: startOfMonth },
        },
        _count: true,
      }),
      
      // Revenue this month
      ctx.db.order.aggregate({
        where: {
          merchantId,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      
      // Recent orders
      ctx.db.order.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          customer: true,
          items: true,
        },
      }),
      
      // Top products
      ctx.db.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: {
            merchantId,
            createdAt: { gte: startOfMonth },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ])
    
    return {
      merchantId,
      stats: {
        totalOrders: orders.reduce((sum, o) => sum + o._count, 0),
        pendingOrders: orders.find(o => o.status === 'PENDING')?._count || 0,
        revenue: revenue._sum.total || 0,
      },
      ordersByStatus: orders,
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
      operatingHours: z.record(
        z.string(),
        z.object({
          open: z.string(),
          close: z.string(),
          closed: z.boolean().optional(),
        })).optional(),
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
        const merchant = await ctx.db.merchant.update({
          where: { id: ctx.session?.user.id },
          data: input,
        })
        
        return merchant
      } catch (error) {
        handleDatabaseError(error)
      }
    }),
    
  // Get dashboard analytics
  analytics: merchantProcedure
    .input(z.object({
      period: z.enum(['today', 'week', 'month', 'year']).default('month'),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session?.user.id
      const now = new Date()
      let startDate: Date
      
      switch (input.period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          break
      }
      
      const [orders, revenue, products, customers] = await Promise.all([
        // Order stats
        ctx.db.order.groupBy({
          by: ['status'],
          where: {
            merchantId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
        
        // Revenue
        ctx.db.order.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: startDate },
          },
          _sum: { total: true },
        }),
        
        // Popular products
        ctx.db.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: {
              merchantId,
              createdAt: { gte: startDate },
            },
          },
          _sum: { quantity: true },
          _count: true,
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        
        // Customer stats
        ctx.db.order.groupBy({
          by: ['customerId'],
          where: {
            merchantId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
      ])
      
      return {
        orders: {
          total: orders.reduce((sum, o) => sum + o._count, 0),
          byStatus: orders,
        },
        revenue: revenue._sum.total || 0,
        popularProducts: products,
        uniqueCustomers: customers.length,
        period: input.period,
      }
    }),

  searchNearby: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      filters: z.object({
        cuisineType: z.array(z.string()).optional(),
        dietaryOptions: z.array(z.enum(['HALAL', 'VEGETARIAN', 'VEGAN'])).optional(),
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
        userLocation: z.object({
          lat: z.number(),
          lng: z.number(),
        }).optional(),
        radius: z.number().min(0.5).max(20).default(5),
        deliveryOnly: z.boolean().optional(),
        pickupOnly: z.boolean().optional(),
      }).default({ radius: 5 }),
    }))
    .query(async ({ input }) => {
      const { query, filters } = input

      //calculate center point from bounds if provided
      let searchLocation = filters.userLocation
      if (!searchLocation && filters.bounds) {
        searchLocation = {
          lat: (filters.bounds.north + filters.bounds.south) / 2,
          lng: (filters.bounds.east + filters.bounds.west) / 2
        }
      }

      // useSearchService to find merchants
      const merchants = await SearchService.searchMerchants({
        query,
        cuisineType: filters.cuisineType,
        latitude: searchLocation?.lat,
        longitude: searchLocation?.lng,
        radius: filters.radius,
        halal: filters.dietaryOptions?.includes('HALAL'),
        deliveryEnabled: filters.deliveryOnly,
        limit: 50
      })

      // filter by bounds
      let filteredMerchants = merchants
      if (filters.bounds && merchants.length > 0) {
        filteredMerchants = merchants.filter(merchant => {
          if (!merchant.latitude || !merchant.longitude) return false

          return (
            merchant.latitude >= filters.bounds!.south &&
            merchant.latitude <= filters.bounds!.north &&
            merchant.longitude >= filters.bounds!.west &&
            merchant.longitude <= filters.bounds!.east
          )
        })
      }

      // additional filtering
      if (filters.pickupOnly) {
        filteredMerchants = filteredMerchants.filter(m => m.pickupEnabled)
      }

      if (filters.dietaryOptions?.includes('VEGETARIAN')) {
        filteredMerchants = filteredMerchants.filter(m =>
          m.cuisineType?.some(c =>
            c.toLowerCase().includes('vegetarian') || c.toLowerCase().includes('vegan')
          )
        )
      }

      // check if currently open
      const merchantsWithStatus = await Promise.all(
        filteredMerchants.map(async (merchant) => {
          const isOpen = await checkIfMerchantOpen(merchant)
          const nextOpenTime = !isOpen ? getNextOpenTime(merchant): null

          return {
            ...merchant,
            isOpen,
            nextOpenTime,
            distance: searchLocation ? SearchService.calculateDistance(
              searchLocation.lat,
              searchLocation.lng,
              merchant.latitude!,
              merchant.longitude!
            ) : undefined,
          }
        })
      )

      // sort by relevance
      merchantsWithStatus.sort((a, b) => {
        // open first
        if (a.isOpen !== b.isOpen)  return a.isOpen ? -1 : 1

        //then distance
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance
        }

        //finally by order count
        return b._count.orders - a._count.orders
      })

      return {
        merchants: merchantsWithStatus,
        total: merchantsWithStatus.length,
        bounds: filters.bounds
      }
    }) 
})

// Helper functions
function checkIfMerchantOpen(merchant: any): boolean {
  if (!merchant.operatingHours) return true // Always open if no hours set
  
  const now = new Date()
  const currentDay = now.toISOString().toLowerCase()
  
  const todayHours = merchant.operatingHours[currentDay]
  if (!todayHours || todayHours.closed) return false
  
  const currentTime = now.toLocaleTimeString(
    'en-US',
    { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false,
      timeZone: 'Asia/Singapore'
    }
  )
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close
}

function getNextOpenTime(merchant: any): Date | null {
  if (!merchant.operatingHours) return null
  
  const now = new Date()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  
  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now)
    checkDate.setDate(checkDate.getDate() + i)
    
    const dayName = days[checkDate.getDay()]
    const dayHours = merchant.operatingHours[dayName!]
    
    if (dayHours && !dayHours.closed) {
      const openTime = new Date(checkDate)
      const [hours, minutes] = dayHours.open.split(':')
      openTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      // If it's today and we haven't passed opening time yet
      if (i === 0 && openTime > now) {
        return openTime
      }
      // If it's a future day
      else if (i > 0) {
        return openTime
      }
    }
  }
  
  return null
}