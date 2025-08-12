import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc"
import { MerchantStatus, ProductStatus, Prisma, PaymentStatus } from "@kitchencloud/database/client"
import { checkIfOpen } from "../utils/operating-hours"
import { getDisplayLocation } from "../utils/get-display-location"
import { calculateDistance } from "../utils/calculate-distance"

export type MerchantMapMarker = {
  id: string
  businessName: string
  slug: string
  address: string | null
  location: { lat: number; lng: number }
  cuisine: string[]
  rating?: number
  reviewCount: number
  minimumOrder: number
  deliveryFee: number
  preparationTime: string
  isOpen: boolean
  logoUrl: string | null
  distance?: number
}

function requireMerchantId(ctx: any) {
  const u = ctx.session?.user
  if (!u || u.role !== "MERCHANT") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Merchant session required" })
  }
  return u.id // treat as merchant.id
}

const boundsSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
})

export const merchantRouter = createTRPCRouter({
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { 
          slug: input.slug,
          status: MerchantStatus.ACTIVE,
          deletedAt: null,
        },
        include: {
          categories: { 
            where: { isActive: true, deletedAt: null },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              imageUrl: true,
              sortOrder: true
            },
          },
          _count: {
            select: {
              products: true,
              reviews: true,
            },
          },
        },
      })

      if (!merchant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" })
      }

      // filtered count plus average rating (do separately)
      const [productCount, reviewCount, ratingAgg] = await Promise.all([
        ctx.db.product.count({
            where: {
                merchantId: merchant.id,
                status: ProductStatus.ACTIVE,
                deletedAt: null,
            }
        }),
        ctx.db.review.count({
            where: {
                merchantId: merchant.id,
                isVisible: true
            }
        }),
        ctx.db.review.aggregate({
            where: {
                merchantId: merchant.id,
                isVisible: true
            },
            _avg: { rating: true }
        })
      ])

      return {
        ...merchant,
        rating: ratingAgg._avg?.rating ?? 0,
        reviewCount,
        productCount,
      }
    }),

  // List all active merchants (public)
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        search: z.string().optional(),
        category: z.string().optional(),
        sortBy: z
          .enum(["popular", "rating", "newest", "name"])
          .default("popular"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, category, sortBy } = input

      // Build where clause
      const where: Prisma.MerchantWhereInput = {
        status: MerchantStatus.ACTIVE,
        ...(search && {
          OR: [
            { businessName: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { cuisineType: { hasSome: [search] } },
          ],
        }),
        ...(category && {
          categories: { some: { slug: category, isActive: true, deletedAt: null } },
        }),
      }

      // Build orderBy
      let orderBy: Prisma.MerchantOrderByWithRelationInput[] = []
      switch (sortBy) {
        case "popular":
            // proxy for popularity: #orders desc, then #reviews desc, then newest
            orderBy = [{ orders: { _count: "desc" } }, { reviews: { _count: "desc" } }, { createdAt: "desc" }]
            break
        case "rating":
            // needs precomputed rating; fall back to name
            orderBy = [{ businessName: "asc" }]
            break
        case "newest":
            orderBy = [{ createdAt: "desc" }]
            break
        case "name":
            orderBy = [{ businessName: "asc" }]
            break
      }

      const merchants = await ctx.db.merchant.findMany({
        where,
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          _count: {
            select: {
              products: true,
              reviews: true,
              orders: true,
            },
          },
          categories: {
            where: { isActive: true, deletedAt: null },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, slug: true, imageUrl: true, sortOrder: true },
          },
        },
      })

      let nextCursor: typeof cursor | undefined
      if (merchants.length > limit) {
        const next = merchants.pop()!
        nextCursor = next.id
      }

      return { items: merchants, nextCursor }
    }),

  // Get merchant dashboard data (protected)
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const merchantId = requireMerchantId(ctx)

    const merchant = await ctx.db.merchant.findUnique({
        where: { id: merchantId },
        select: {
            id: true,
            businessName: true,
            slug: true,
            status: true,
            deletedAt: true,
            createdAt: true,
            logoUrl: true,
        },
    })
    if (!merchant || merchant.deletedAt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" })
    }

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalProducts, totalOrders, totalReviews, todayOrders, todayRevenueAgg, pendingOrders] = 
    await Promise.all([
      ctx.db.product.count({
        where: { merchantId, deletedAt: null },
      }),
      ctx.db.order.count({
        where: { merchantId },
      }),
      ctx.db.review.count({
        where: { merchantId, isVisible: true },
      }),
      ctx.db.order.count({
        where: { merchantId, createdAt: { gte: today } },
      }),
      ctx.db.order.aggregate({
        where: {
            merchantId,
            createdAt: { gte: today },
            paymentStatus: PaymentStatus.COMPLETED,
        },
        _sum: { total: true }
      }),
      ctx.db.order.count({
        where: { merchantId, status: "PENDING" },
      }),
    ])

    const todayRevenueNumber = Number(todayRevenueAgg._sum?.total ?? 0)

    return {
      merchant,
      stats: {
        totalProducts,
        totalOrders,
        totalReviews,
        todayOrders,
        todayRevenue: todayRevenueNumber,
        pendingOrders,
      },
    }
    }),

  // Update merchant profile (protected)
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        logo: z.string().url().optional(),
        coverImage: z.string().url().optional(),
        businessHours: z.any().optional(),
        cuisineType: z.array(z.string()).optional(),
        preparationTime: z.number().int().min(0).optional(),
        minimumOrder: z.number().positive().optional(),
        deliveryFee: z.number().min(0).optional(),
        deliveryRadius: z.number().positive().optional(),
        postalCode: z.string().optional(),                            // optional extra mapping if you need it
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        halal: z.boolean().optional(),
        deliveryEnabled: z.boolean().optional(),
        pickupEnabled: z.boolean().optional(),
        businessType: z.string().optional(),
        paynowNumber: z.string().optional(),
        paynowQrCode: z.string().url().optional(),
        settings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
        const merchantId = requireMerchantId(ctx)

        const merchant = await ctx.db.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, email: true, phone: true, slug: true },
        })

        if (!merchant) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found" })
        }

        // uniqueness guards for email/phone
        if (input.email && input.email !== merchant.email) {
            const emailClash = await ctx.db.merchant.findUnique({ where: { email: input.email } })
            if (emailClash) {
                throw new TRPCError({ code: "CONFLICT", message: "Email already in use"})
            }
        }
        if (input.phone  && input.phone  !== merchant.phone ) {
            const phoneClash = await ctx.db.merchant.findUnique({ where: { phone : input.phone  } })
            if (phoneClash) {
                throw new TRPCError({ code: "CONFLICT", message: "Phone already in use"})
            }
        }

        const {
        name,
        description,
        phone,
        email,
        address,
        logo,
        coverImage,
        businessHours,
        cuisineType,
        preparationTime,
        minimumOrder,
        deliveryFee,
        deliveryRadius,
        postalCode,
        latitude,
        longitude,
        halal,
        deliveryEnabled,
        pickupEnabled,
        businessType,
        paynowNumber,
        paynowQrCode,
        settings,
        } = input

        const data: Prisma.MerchantUpdateInput = {
        ...(name !== undefined ? { businessName: name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(logo !== undefined ? { logoUrl: logo } : {}),
        ...(coverImage !== undefined ? { bannerUrl: coverImage } : {}),
        ...(businessHours !== undefined ? { operatingHours: businessHours } : {}),
        ...(cuisineType !== undefined ? { cuisineType } : {}),
        ...(preparationTime !== undefined ? { preparationTime } : {}),
        ...(minimumOrder !== undefined ? { minimumOrder: new Prisma.Decimal(minimumOrder) } : {}),
        ...(deliveryFee !== undefined ? { deliveryFee: new Prisma.Decimal(deliveryFee) } : {}),
        ...(deliveryRadius !== undefined ? { deliveryRadius } : {}),
        ...(postalCode !== undefined ? { postalCode } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(halal !== undefined ? { halal } : {}),
        ...(deliveryEnabled !== undefined ? { deliveryEnabled } : {}),
        ...(pickupEnabled !== undefined ? { pickupEnabled } : {}),
        ...(businessType !== undefined ? { businessType } : {}),
        ...(paynowNumber !== undefined ? { paynowNumber } : {}),
        ...(paynowQrCode !== undefined ? { paynowQrCode } : {}),
        ...(settings !== undefined ? { settings } : {}),
        }

        const updated = await ctx.db.merchant.update({
            where: { id: merchantId },
            data
        })

        return updated
    }),

  // search merchants for map display
  searchNearby: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        filters: z.object({
          cuisine: z.string().optional(),
          isOpen: z.boolean().optional(),
          hasDelivery: z.boolean().optional(),
          minRating: z.number().optional(),
          maxDeliveryFee: z.number().optional(),
          bounds: boundsSchema.optional()
        }).optional(),
        userLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, filters = {}, userLocation } = input

      // where clause
      const where: any = {
        status: 'ACTIVE',
        deletedAt: null,
      }

      // search query
      if (query) {
        where.OR = [
          { businessName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { categories: { some: { name: { contains: query, mode: 'insensitive' } } } },
        ]
      }

      // cuisine filter
      if (filters.cuisine) {
        where.categories = { some: { name: { equals: filters.cuisine, mode: 'insensitive' } } }
      }

      // has delivery filter
      if (filters.hasDelivery !== undefined) {
        where.deliveryFee = filters.hasDelivery ? { gt: 0 } : { equals: 0 }
      }

      // bounds filter
      if (filters.bounds) {
        where.AND = [
          { latitude: { gte: filters.bounds.south, lte: filters.bounds.north } },
          { longitude: { gte: filters.bounds.west, lte: filters.bounds.east } }
        ]
      }

      // fetch merchants
      const merchants = await ctx.db.merchant.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          slug: true,
          description: true,
          logoUrl: true,
          address: true,
          latitude: true,
          longitude: true,
          showExactLocation: true,
          minimumOrder: true,
          deliveryFee: true,
          preparationTime: true,
          operatingHours: true,
          categories: { select: { name: true } },
          _count: { select: { reviews: true } },
          reviews: { select: { rating: true } }          
        },
        take: 100
      })

      // process and filter merchants
      const processedMerchants = merchants
        .map((m): MerchantMapMarker | null => {
          // calculate average rating
          const avgRating = 
            m.reviews.length > 0
              ? m.reviews.reduce((sum, r) => sum + r.rating, 0) / m.reviews.length
              : null

          // check if meets rating filter
          if (filters.minRating != null && (avgRating == null || avgRating < filters.minRating)) {
            return null
          }

          // check if meets delivery fee filter
          if (filters.maxDeliveryFee != null && Number(m.deliveryFee) > filters.maxDeliveryFee) {
            return null
          }

          // get display location
          const location = getDisplayLocation({
            latitude: m.latitude,
            longitude: m.longitude,
            showExactLocation: m.showExactLocation
          })
          if (!location) return null

          // check operating hours
          const isOpen = m.operatingHours ? checkIfOpen(m.operatingHours as any) : true
          if (filters.isOpen !== undefined && isOpen !== filters.isOpen) {
            return null
          }

          // calculate distance if user location provided
          let distance: number | undefined
          if (userLocation && m.latitude != null && m.longitude != null) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude)
          }

          return {
            id: m.id,
            businessName: m.businessName,
            slug: m.slug,
            address: m.address,
            location,
            cuisine: m.categories.map(c => c.name),
            rating: avgRating != null ? Math.round(avgRating * 10) / 10 : undefined,
            reviewCount: m._count.reviews,
            minimumOrder: Number(m.minimumOrder),
            deliveryFee: Number(m.deliveryFee),
            preparationTime: String(m.preparationTime),
            isOpen,
            logoUrl: m.logoUrl,
            distance,
          }
        })
        .filter((x): x is MerchantMapMarker => x !== null)

        // sort by distance
        if (userLocation) {
          processedMerchants.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
        }

        return {
          merchants: processedMerchants,
          total: processedMerchants.length,
        }
    })
})