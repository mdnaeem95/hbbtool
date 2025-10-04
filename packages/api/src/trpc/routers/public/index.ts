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
  categoryIds: z.array(z.string()).optional(),
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

  // Get single product by merchant slug + product id (WITH VARIANTS)
  getProduct: publicProcedure
    .input(z.object({
      merchantSlug: z.string(),
      productId: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.merchantSlug, status: 'ACTIVE', deletedAt: null },
        select: { id: true, businessName: true },
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
          // Include variants sorted by default first, then sortOrder
          variants: { 
            orderBy: [
              { isDefault: 'desc' },
              { sortOrder: 'asc' }
            ]
          },
          modifierGroups: {
            where: {
              isActive: true,
            },
            include: {
              modifiers: {
                where: {
                  isAvailable: true,
                  isHidden: false, // Don't show hidden modifiers to customers
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

      // Add merchant info to the response
      return {
        ...product,
        merchant,
      }
    }),

  // Enhanced product listing with proper filtering, sorting, and VARIANTS
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

      // In stock filter - now considering variants
      if (input.inStock === true) {
        where.OR = [
          { trackInventory: false },
          { 
            AND: [
              { trackInventory: true },
              { inventory: { gt: 0 } }
            ]
          },
          // Also consider products with in-stock variants
          {
            AND: [
              { trackInventory: true },
              {
                variants: {
                  some: {
                    inventory: { gt: 0 }
                  }
                }
              }
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
          orderBy = [
            { orderItems: { _count: 'desc' } },
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ]
          break
        case 'rating':
          orderBy = [
            { reviews: { _count: 'desc' } },
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ]
          break
        case 'featured':
        default:
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

      // Fetch products with all related data including VARIANTS
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
          // Include variants for price range calculation
          variants: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              priceAdjustment: true,
              inventory: true,
              isDefault: true,
            },
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
              modifierGroups: {
                where: { isActive: true }
              },
            }
          },
        },
      })

      // Transform products to include computed fields and price ranges
      const transformedProducts = products.map(product => {
        // Calculate price range if product has variants
        let minPrice = asNumber(product.price)
        let maxPrice = asNumber(product.price)
        
        if (product.variants && product.variants.length > 0) {
          const prices = product.variants.map(v => 
            asNumber(product.price) + asNumber(v.priceAdjustment)
          )
          minPrice = Math.min(...prices)
          maxPrice = Math.max(...prices)
        }
        
        return {
          ...product,
          // Convert Decimal to number for frontend
          price: asNumber(product.price),
          compareAtPrice: product.compareAtPrice ? asNumber(product.compareAtPrice) : null,
          // Add price range for variants
          priceRange: {
            min: minPrice,
            max: maxPrice,
            hasVariants: product.variants.length > 0,
          },
          // Add computed fields
          isOnSale: product.compareAtPrice && product.compareAtPrice > product.price,
          discountPercentage: product.compareAtPrice && product.compareAtPrice > product.price
            ? Math.round(((asNumber(product.compareAtPrice) - asNumber(product.price)) / asNumber(product.compareAtPrice)) * 100)
            : null,
          // Stock status (consider variants)
          inStock: !product.trackInventory || 
                   product.inventory > 0 || 
                   (product.variants && product.variants.some(v => v.inventory > 0)),
          lowStock: product.trackInventory && product.inventory > 0 && product.inventory <= 5,
          // Add customization indicator
          hasCustomizations: product._count.modifierGroups > 0,
        }
      })

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

  // Check variant availability (NEW ENDPOINT)
  checkVariantAvailability: publicProcedure
    .input(z.object({
      productId: z.string().cuid(),
      variantId: z.string().cuid().optional(),
      quantity: z.number().positive(),
    }))
    .query(async ({ ctx, input }) => {
      // If variant specified, check variant inventory
      if (input.variantId) {
        const variant = await ctx.db.productVariant.findUnique({
          where: { id: input.variantId },
          select: {
            inventory: true,
            product: {
              select: {
                trackInventory: true,
                status: true,
              },
            },
          },
        })

        if (!variant || variant.product.status !== 'ACTIVE') {
          return { available: false, message: 'Product variant not found' }
        }

        // If product doesn't track inventory, always available
        if (!variant.product.trackInventory) {
          return { available: true }
        }

        if (variant.inventory < input.quantity) {
          return {
            available: false,
            message: `Only ${variant.inventory} available`,
            maxQuantity: variant.inventory,
          }
        }

        return { available: true }
      }

      // Check product-level inventory
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: {
          trackInventory: true,
          inventory: true,
          status: true,
        },
      })

      if (!product || product.status !== 'ACTIVE') {
        return { available: false, message: 'Product not found' }
      }

      if (!product.trackInventory) {
        return { available: true }
      }

      if (product.inventory < input.quantity) {
        return {
          available: false,
          message: `Only ${product.inventory} available`,
          maxQuantity: product.inventory,
        }
      }

      return { available: true }
    }),

  // Create checkout session (WITH VARIANT SUPPORT)
  createCheckout: publicProcedure
    .input(z.object({
      merchantId: z.string().uuid(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
        variantId: z.string().cuid().optional(), // Add variant support
        customizations: z.any().optional(), // Add customizations support
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

      // Validate products & variants, compute totals
      const productIds = input.items.map(i => i.productId)
      const variantIds = input.items
        .filter(i => i.variantId)
        .map(i => i.variantId!)

      // Fetch products and variants
      const [products, variants] = await Promise.all([
        ctx.db.product.findMany({
          where: {
            id: { in: productIds },
            merchantId: input.merchantId,
            status: 'ACTIVE',
            deletedAt: null,
          },
          select: { 
            id: true, 
            name: true, 
            price: true,
            trackInventory: true,
            inventory: true,
          },
        }),
        variantIds.length > 0
          ? ctx.db.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: {
                id: true,
                productId: true,
                name: true,
                priceAdjustment: true,
                inventory: true,
              },
            })
          : Promise.resolve([]),
      ])

      const productMap = new Map(products.map(p => [p.id, p]))
      const variantMap = new Map(variants.map(v => [v.id, v]))

      let subtotal = 0
      const orderItems = []

      for (const item of input.items) {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Product ${item.productId} not available` 
          })
        }

        let unitPrice = asNumber(product.price)
        let variantName = ''
        
        // Add variant price adjustment if variant selected
        if (item.variantId) {
          const variant = variantMap.get(item.variantId)
          if (!variant || variant.productId !== product.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid variant ${item.variantId} for product ${item.productId}`
            })
          }
          
          // Check variant inventory
          if (product.trackInventory && variant.inventory < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient stock for ${product.name} - ${variant.name}`
            })
          }
          
          unitPrice += asNumber(variant.priceAdjustment)
          variantName = variant.name
        } else {
          // Check product inventory if no variant
          if (product.trackInventory && product.inventory < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient stock for ${product.name}`
            })
          }
        }
        
        // Calculate customization price if any
        let customizationPrice = 0
        if (item.customizations) {
          // Add logic to calculate customization price based on your needs
          // This would require fetching modifier groups and calculating prices
        }
        
        unitPrice += customizationPrice
        const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100
        subtotal += lineTotal
        
        orderItems.push({
          productId: item.productId,
          productName: product.name,
          productPrice: asNumber(product.price),
          quantity: item.quantity,
          price: unitPrice,
          total: lineTotal,
          notes: item.notes,
          variant: item.variantId ? {
            id: item.variantId,
            name: variantName,
          } : null,
          customizations: item.customizations || null,
        })
      }
      
      subtotal = Math.round(subtotal * 100) / 100

      const deliveryFee = input.deliveryMethod === 'DELIVERY' ? asNumber(merchant.deliveryFee ?? 0) : 0
      const total = Math.round((subtotal + deliveryFee) * 100) / 100

      // Minimum order check
      const minOrder = asNumber(merchant.minimumOrder ?? 0)
      if (total < minOrder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${minOrder.toFixed(2)}`,
        })
      }

      // Persist checkout session
      const sessionId = nanoid(32)
      await ctx.db.checkoutSession.create({
        data: {
          sessionId,
          merchantId: input.merchantId,
          items: orderItems as unknown as any,
          deliveryAddress: input.deliveryAddress as unknown as any,
          contactInfo: {
            ...input.customer,
            deliveryMethod: input.deliveryMethod,
            scheduledFor: input.scheduledFor ?? null,
          } as unknown as any,
          subtotal,
          deliveryFee,
          total,
          promotionCodes: [],
          ipAddress: ctx.req.headers.get('x-forwarded-for') ?? ctx.req.headers.get('x-real-ip') ?? ctx.ip,
          userAgent: ctx.req.headers.get('user-agent'),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })

      // Normalize payment methods
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

  // Public order tracker (unchanged)
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

  getCategories: publicProcedure
    .input(z.object({ merchantSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.merchantSlug, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      })
      
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      const categories = await ctx.db.category.findMany({
        where: {
          products: {
            some: {
              merchantId: merchant.id,
              status: 'ACTIVE',
              deletedAt: null,
            }
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          _count: {
            select: {
              products: {
                where: {
                  merchantId: merchant.id,
                  status: 'ACTIVE',
                  deletedAt: null,
                }
              }
            }
          }
        },
      })

      return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        productCount: cat._count.products,
      }))
    }),
})