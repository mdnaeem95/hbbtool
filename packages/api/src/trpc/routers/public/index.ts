import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../core'
import { paginationSchema, phoneSchema } from '../../../utils/validation'
import { DeliveryMethod, Prisma } from '@homejiak/database'
import { nanoid } from 'nanoid'

/* ---------------- helpers ---------------- */
const asNumber = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'toNumber' in (v as any)) {
    try { return (v as any).toNumber() } catch {}
  }
  return Number(v ?? 0)
}

// Enhanced sorting schema
const sortSchema = z.enum([
  'featured',
  'price-asc', 
  'price-desc',
  'newest',
  'popular',
  'name-asc',
  'name-desc',
  'rating',
])

// Enhanced filter schema
const productFilterSchema = z.object({
  merchantSlug: z.string(),
  categoryId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(), // Support multiple categories
  search: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  inStock: z.boolean().optional(),
  sort: sortSchema.optional().default('featured'),
  ...paginationSchema.shape,
})

/* ---------------- router ---------------- */
export const publicRouter = router({
  // Get merchant storefront
  getMerchant: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.slug, status: 'ACTIVE', deletedAt: null },
        include: {
          categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          _count: { select: { products: true, reviews: true } },
        },
      })

      if (!merchant) throw new TRPCError({ code: 'NOT_FOUND' })

      // Track analytics (best-effort)
      await ctx.db.analytics.create({
        data: {
          merchantId: merchant.id,
          event: 'storefront_view',
          properties: {
            referrer: ctx.req.headers.get('referer') ?? null,
            userAgent: ctx.req.headers.get('user-agent') ?? null,
          },
        },
      }).catch(() => {})

      return merchant
    }),

  // Get single product by merchant slug + product id
  getProduct: publicProcedure
    .input(z.object({
      merchantSlug: z.string(),
      productId: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.merchantSlug, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      })
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      const product = await ctx.db.product.findFirst({
        where: {
          id: input.productId,
          merchantId: merchant.id,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          category: true,
          variants: { orderBy: { isDefault: 'desc' } },
          modifierGroups: {
            where: {
              isActive: true,
            },
            include: {
              modifiers: {
                where: {
                  isAvailable: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: { select: { orderItems: true, reviews: true } },
        },
      })
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
      }

      // Track product view (best-effort)
      await ctx.db.analytics.create({
        data: {
          merchantId: merchant.id,
          event: 'product_view',
          properties: {
            productId: product.id,
            productName: product.name,
            price: asNumber(product.price),
          },
        },
      }).catch(() => {})

      return product
    }),

  // Enhanced product listing with proper filtering and sorting
  listProducts: publicProcedure
    .input(productFilterSchema)
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { 
          slug: input.merchantSlug, 
          status: 'ACTIVE', 
          deletedAt: null 
        },
        select: { id: true },
      })
      
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      // Build where clause with all filters
      const where: Prisma.ProductWhereInput = {
        merchantId: merchant.id,
        status: 'ACTIVE',
        deletedAt: null,
      }

      // Category filter (support single or multiple)
      if (input.categoryId) {
        where.categoryId = input.categoryId
      } else if (input.categoryIds && input.categoryIds.length > 0) {
        where.categoryId = { in: input.categoryIds }
      }

      // Search filter
      if (input.search) {
        const searchTerm = input.search.trim()
        if (searchTerm) {
          where.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm.toLowerCase()] } },
            { sku: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }
      }

      // Price range filter
      if (input.minPrice !== undefined || input.maxPrice !== undefined) {
        where.price = {}
        if (input.minPrice !== undefined) {
          where.price.gte = input.minPrice
        }
        if (input.maxPrice !== undefined) {
          where.price.lte = input.maxPrice
        }
      }

      // Tags filter
      if (input.tags && input.tags.length > 0) {
        where.tags = { hasSome: input.tags }
      }

      // Featured filter
      if (input.featured !== undefined) {
        where.featured = input.featured
      }

      // In stock filter
      if (input.inStock === true) {
        where.OR = [
          { trackInventory: false },
          { 
            AND: [
              { trackInventory: true },
              { inventory: { gt: 0 } }
            ]
          }
        ]
      }

      // Build order by clause based on sort parameter
      let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[]
      
      switch (input.sort) {
        case 'price-asc':
          orderBy = { price: 'asc' }
          break
        case 'price-desc':
          orderBy = { price: 'desc' }
          break
        case 'newest':
          orderBy = { createdAt: 'desc' }
          break
        case 'name-asc':
          orderBy = { name: 'asc' }
          break
        case 'name-desc':
          orderBy = { name: 'desc' }
          break
        case 'popular':
          // Sort by order count (requires aggregation)
          orderBy = [
            { orderItems: { _count: 'desc' } },
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ]
          break
        case 'rating':
          // Sort by average rating
          orderBy = [
            { reviews: { _count: 'desc' } },  // Use reviews relation count
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ]
          break
        case 'featured':
        default:
          // Featured first, then by popularity/recency
          orderBy = [
            { featured: 'desc' },
            { orderItems: { _count: 'desc' } },
            { createdAt: 'desc' }
          ]
          break
      }

      // Get total count for pagination
      const total = await ctx.db.product.count({ where })

      // Calculate pagination
      const limit = input.limit || 20
      const page = input.page || 1
      const skip = (page - 1) * limit

      // Fetch products with all related data
      const products = await ctx.db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          modifierGroups: {
            where: {
              isActive: true,
            },
            include: {
              modifiers: {
                where: {
                  isAvailable: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            }
          },
        },
      })

      // Transform products to include computed fields
      const transformedProducts = products.map(product => ({
        ...product,
        // Convert Decimal to number for frontend
        price: asNumber(product.price),
        compareAtPrice: product.compareAtPrice ? asNumber(product.compareAtPrice) : null,
        // Add effective price (considering variants)
        effectivePrice: asNumber(product.price),
        // Add computed fields
        isOnSale: product.compareAtPrice && product.compareAtPrice > product.price,
        discountPercentage: product.compareAtPrice && product.compareAtPrice > product.price
          ? Math.round(((asNumber(product.compareAtPrice) - asNumber(product.price)) / asNumber(product.compareAtPrice)) * 100)
          : null,
        // Stock status
        inStock: !product.trackInventory || product.inventory > 0,
        lowStock: product.trackInventory && product.inventory > 0 && product.inventory <= 5,
      }))

      // Return paginated response
      return {
        items: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        // Include filter metadata
        appliedFilters: {
          categories: input.categoryIds || (input.categoryId ? [input.categoryId] : []),
          priceRange: (input.minPrice || input.maxPrice) ? {
            min: input.minPrice,
            max: input.maxPrice,
          } : null,
          search: input.search || null,
          sort: input.sort,
        },
        // Include aggregations for dynamic filter options
        aggregations: {
          priceRange: await ctx.db.product.aggregate({
            where: {
              merchantId: merchant.id,
              status: 'ACTIVE',
              deletedAt: null,
            },
            _min: { price: true },
            _max: { price: true },
            _avg: { price: true },
          }).then(agg => ({
            min: agg._min.price ? asNumber(agg._min.price) : 0,
            max: agg._max.price ? asNumber(agg._max.price) : 0,
            avg: agg._avg.price ? asNumber(agg._avg.price) : 0,
          })),
          categoryCount: await ctx.db.product.groupBy({
            by: ['categoryId'],
            where: {
              merchantId: merchant.id,
              status: 'ACTIVE',
              deletedAt: null,
              categoryId: { not: null },
            },
            _count: true,
          }).then(groups => 
            groups.reduce((acc, g) => ({
              ...acc,
              [g.categoryId!]: g._count,
            }), {} as Record<string, number>)
          ),
        },
      }
    }),

  // Create checkout session (public)
  createCheckout: publicProcedure
    .input(z.object({
      merchantId: z.string().uuid(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
        variantId: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
      deliveryMethod: z.nativeEnum(DeliveryMethod),
      deliveryAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        postalCode: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }).optional(),
      customer: z.object({
        name: z.string().min(1),
        phone: phoneSchema,
        email: z.string().email().optional(),
      }),
      scheduledFor: z.coerce.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate merchant + capabilities
      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, status: 'ACTIVE', deletedAt: null },
        select: {
          id: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFee: true,
          minimumOrder: true,
          paynowNumber: true,
          paynowQrCode: true,
        },
      })
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found or inactive' })
      }
      if (input.deliveryMethod === 'DELIVERY' && !merchant.deliveryEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Delivery not available' })
      }
      if (input.deliveryMethod === 'PICKUP' && !merchant.pickupEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pickup not available' })
      }

      // Validate products & compute totals (lock current prices)
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map(i => i.productId) },
          merchantId: input.merchantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true, name: true, price: true },
      })
      const byId = new Map(products.map(p => [p.id, p]))
      let subtotal = 0
      const orderItems = input.items.map(it => {
        const p = byId.get(it.productId)
        if (!p) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Product ${it.productId} not available` })
        }
        const unit = asNumber(p.price)
        const line = Math.round(unit * it.quantity * 100) / 100
        subtotal += line
        return {
          productId: it.productId,
          productName: p.name,
          productPrice: unit,
          quantity: it.quantity,
          price: unit,
          total: line,
          notes: it.notes,
          variantId: it.variantId,
        }
      })
      subtotal = Math.round(subtotal * 100) / 100

      const deliveryFee = input.deliveryMethod === 'DELIVERY' ? asNumber(merchant.deliveryFee ?? 0) : 0
      const total = Math.round((subtotal + deliveryFee) * 100) / 100

      // Minimum order check (compare against subtotal or total; here we use total)
      const minOrder = asNumber(merchant.minimumOrder ?? 0)
      if (total < minOrder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${minOrder.toFixed(2)}`,
        })
      }

      // Persist checkout session (30 mins)
      const sessionId = nanoid(32)
      await ctx.db.checkoutSession.create({
        data: {
          sessionId,
          merchantId: input.merchantId,
          items: orderItems as unknown as any,          // JSON column
          deliveryAddress: input.deliveryAddress as unknown as any, // JSON column
          // Persist public-only bits here (schema has no dedicated fields)
          contactInfo: {
            ...input.customer,
            deliveryMethod: input.deliveryMethod,       // ← stored inside JSON
            scheduledFor: input.scheduledFor ?? null,   // ← stored inside JSON
          } as unknown as any,
          subtotal,
          deliveryFee,
          total,
          promotionCodes: [],                            // ← required array field
          ipAddress: ctx.req.headers.get('x-forwarded-for') ?? ctx.req.headers.get('x-real-ip') ?? ctx.ip,
          userAgent: ctx.req.headers.get('user-agent'),
          // expiresAt has no default; createdAt has a default; updatedAt is @updatedAt
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })

      // Normalize payment methods (derive from merchant PayNow fields)
      const paymentMethods = merchant.paynowNumber
        ? [{
            method: 'PAYNOW' as const,
            enabled: true,
            details: { number: merchant.paynowNumber, qrCode: merchant.paynowQrCode },
          }]
        : []

      return {
        sessionId,
        total,
        paymentMethods,
        paynowNumber: merchant.paynowNumber,
        paynowQrCode: merchant.paynowQrCode,
      }
    }),

  // Public order tracker
  trackOrder: publicProcedure
    .input(z.object({
      orderNumber: z.string().min(3),
      phone: phoneSchema,
    }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: { orderNumber: input.orderNumber, customerPhone: input.phone },
        include: {
          merchant: { select: { businessName: true, phone: true } },
          items: { include: { product: true } },
          deliveryAddress: true,
          events: { orderBy: { createdAt: 'desc' } },
        },
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
      }

      return order
    }),

  getMerchantBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { 
          slug: input.slug, 
          status: 'ACTIVE', 
          deletedAt: null 
        },
        include: {
          categories: { 
            where: { isActive: true }, 
            orderBy: { sortOrder: 'asc' } 
          },
          _count: { 
            select: { products: true, reviews: true } 
          },
        },
      })

      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      return merchant
    }),
})