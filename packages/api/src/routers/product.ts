import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc"
import { Prisma, ProductStatus } from "@kitchencloud/database/client"

// Input schemas
const productFilterSchema = z.object({
  merchantId: z.string().optional(),
  merchantSlug: z.string().optional(),
  categoryId: z.string().optional(),
  categories: z.array(z.string()).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  featured: z.boolean().optional(),
  available: z.boolean().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  preparationTime: z.string().optional(),
})

const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  skip: z.number().optional(),
})

const sortSchema = z.object({
  sortBy: z.enum([
    "featured",
    "price-asc", 
    "price-desc",
    "newest",
    "popular",
    "name",
  ]).default("featured"),
})

const createProductSchema = z.object({
  merchantId: z.string(),
  categoryId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  images: z.array(z.string().url()).min(1),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  variants: z.any().optional(),
  inventory: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  featured: z.boolean().default(false),
  availableFrom: z.date().optional(),
  availableTo: z.date().optional(),
  maxOrderQty: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  preparationTime: z.string().optional(),
  nutritionalInfo: z.any().optional(),
  allergens: z.array(z.string()).default([]),
})

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string(),
})

export const productRouter = createTRPCRouter({
  // List products with filters and pagination
  list: publicProcedure
    .input(
      z.object({
        filters: productFilterSchema.optional(),
        pagination: paginationSchema.optional(),
        sort: sortSchema.optional(),
      })
    )
    .query(async ({ input, ctx }: { input: any, ctx: any }) => {
        const { filters = {}, pagination = {}, sort = {} } = input
      const { limit = 20, cursor, skip = 0 } = pagination
      const { sortBy = "featured" } = sort

      // Build where clause
      const where: Prisma.ProductWhereInput = {
        deletedAt: null,
        ...(filters.merchantId && { merchantId: filters.merchantId }),
        ...(filters.merchantSlug && {
          merchant: { slug: filters.merchantSlug },
        }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.categories && {
          categoryId: { in: filters.categories },
        }),
        ...(filters.status && { status: filters.status }),
        ...(filters.featured !== undefined && { featured: filters.featured }),
        ...(filters.available && {
          status: ProductStatus.ACTIVE,
          inventory: { gt: 0 },
        }),
        ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
          ? {
              price: {
                ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
                ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
              },
            }
          : {}),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { tags: { has: filters.search } },
          ],
        }),
        ...(filters.tags && {
          tags: { hasSome: filters.tags },
        }),
        ...(filters.preparationTime && {
          preparationTime: filters.preparationTime,
        }),
      }

      // Build orderBy
      let orderBy: Prisma.ProductOrderByWithRelationInput[] = []
      switch (sortBy) {
        case "featured":
          orderBy = [{ featured: "desc" }, { createdAt: "desc" }]
          break
        case "price-asc":
          orderBy = [{ price: "asc" }]
          break
        case "price-desc":
          orderBy = [{ price: "desc" }]
          break
        case "newest":
          orderBy = [{ createdAt: "desc" }]
          break
        case "popular":
          // This would require a join with views or orders
          orderBy = [{ orderItems: { _count: "desc" } }]
          break
        case "name":
          orderBy = [{ name: "asc" }]
          break
      }

      // Execute query
      const [products, totalCount] = await Promise.all([
        ctx.db.product.findMany({
          where,
          orderBy,
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip }),
          include: {
            merchant: {
              select: {
                id: true,
                businessName: true,
                slug: true,
                logoUrl: true,
              },
            },
            category: true,
            _count: {
              select: {
                orderItems: true,
                reviews: true,
              },
            },
          },
        }),
        ctx.db.product.count({ where }),
      ])

      let nextCursor: typeof cursor | undefined = undefined
      if (products.length > limit) {
        const nextItem = products.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: products,
        nextCursor,
        totalCount,
        hasMore: products.length === limit,
      }
    }),

  // Get single product
  get: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
        slug: z.string().optional(),
        merchantSlug: z.string().optional(),
        sessionId: z.string().optional()
      })
    )
    .query(async ({ input, ctx }: { input: any, ctx: any }) => {
      if (!input.id && !input.slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either id or slug is required",
        })
      }

      const product = await ctx.db.product.findFirst({
        where: {
          deletedAt: null,
          ...(input.id && { id: input.id }),
          ...(input.slug && { slug: input.slug }),
          ...(input.merchantSlug && {
            merchant: { slug: input.merchantSlug },
          }),
        },
        include: {
          merchant: true,
          category: true,
          reviews: {
            where: { isVisible: true },
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            },
          },
        },
      })

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        })
      }

      // Track view
      if (input.sessionId) {
        ctx.db.productView.create({
          data: {
            productId: product.id,
            sessionId: input.sessionId // Get from session/cookie
          },
        }).catch(() => {}) // Ignore errors
      }

      return product
    }),

  // Get related products
  getRelated: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().min(1).max(10).default(4),
      })
    )
    .query(async ({ input, ctx }: { input: any, ctx: any }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: {
          categoryId: true,
          merchantId: true,
          tags: true,
          price: true,
        },
      })

      if (!product) {
        return []
      }

      // Find products in same category or with similar tags
      const relatedProducts = await ctx.db.product.findMany({
        where: {
          id: { not: input.productId },
          deletedAt: null,
          status: ProductStatus.ACTIVE,
          OR: [
            { categoryId: product.categoryId },
            { tags: { hasSome: product.tags } },
            {
              price: {
                gte: product.price.toNumber() * 0.7,
                lte: product.price.toNumber() * 1.3,
              },
            },
          ],
        },
        take: input.limit,
        orderBy: [
          { featured: "desc" },
          { orderItems: { _count: "desc" } },
        ],
        include: {
          merchant: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      })

      return relatedProducts
    }),

  // Search products
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        merchantId: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }: { input: any, ctx: any }) => {
      const products = await ctx.db.product.findMany({
        where: {
          deletedAt: null,
          status: ProductStatus.ACTIVE,
          ...(input.merchantId && { merchantId: input.merchantId }),
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } },
            { tags: { has: input.query } },
          ],
        },
        take: input.limit,
        orderBy: [
          { featured: "desc" },
          { name: "asc" },
        ],
        include: {
          merchant: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      })

      return products
    }),

  // Create product (merchant only)
  create: protectedProcedure
    .input(createProductSchema)
    .mutation(async ({ input, ctx }: { input: any, ctx: any }) => {
      // Verify merchant ownership
      const merchant = await ctx.db.merchant.findFirst({
        where: {
          id: input.merchantId,
          userId: ctx.session.user.id,
        },
      })

      if (!merchant) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to add products to this merchant",
        })
      }

      // Generate slug
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      const product = await ctx.db.product.create({
        data: {
          ...input,
          slug,
          price: new Prisma.Decimal(input.price),
        },
      })

      return product
    }),

  // Update product (merchant only)
  update: protectedProcedure
    .input(updateProductSchema)
    .mutation(async ({ input, ctx }: { input: any, ctx: any }) => {
      const { id, ...data } = input

      // Verify ownership
      const product = await ctx.db.product.findFirst({
        where: {
          id,
          merchant: {
            userId: ctx.session.user.id,
          },
        },
      })

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found or you don't have permission",
        })
      }

      // Update slug if name changed
      let slug = product.slug
      if (data.name && data.name !== product.name) {
        slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      }

      const updated = await ctx.db.product.update({
        where: { id },
        data: {
          ...data,
          slug,
          ...(data.price && { price: new Prisma.Decimal(data.price) }),
        },
      })

      return updated
    }),

  // Delete product (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }: { input: any, ctx: any }) => {
      // Verify ownership
      const product = await ctx.db.product.findFirst({
        where: {
          id: input.id,
          merchant: {
            userId: ctx.session.user.id,
          },
        },
      })

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found or you don't have permission",
        })
      }

      await ctx.db.product.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    }),

  // Bulk update products
  bulkUpdate: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        data: z.object({
          status: z.nativeEnum(ProductStatus).optional(),
          featured: z.boolean().optional(),
          categoryId: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }: { input: any, ctx: any }) => {
      // Verify all products belong to user's merchants
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.ids },
          merchant: {
            userId: ctx.session.user.id,
          },
        },
      })

      if (products.length !== input.ids.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Some products not found or you don't have permission",
        })
      }

      const updated = await ctx.db.product.updateMany({
        where: { id: { in: input.ids } },
        data: input.data,
      })

      return { count: updated.count }
    }),
})