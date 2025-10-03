import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, publicProcedure, merchantProcedure } from "../../core"

export const categoryRouter = router({
  // Search categories with autocomplete (public - anyone can see categories)
  search: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const where = input.query
        ? {
            name: {
              contains: input.query,
              mode: "insensitive" as const,
            },
          }
        : {}

      const categories = await ctx.db.category.findMany({
        where,
        orderBy: [
          { usageCount: "desc" }, // Most popular first
          { name: "asc" },
        ],
        take: input.limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          usageCount: true,
        },
      })

      return categories
    }),

  // Get all categories (for admin or analytics)
  getAll: publicProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      orderBy: z.enum(["name", "usageCount", "createdAt"]).default("usageCount"),
      order: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit

      const [categories, total] = await Promise.all([
        ctx.db.category.findMany({
          skip,
          take: input.limit,
          orderBy: { [input.orderBy]: input.order },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            usageCount: true,
            createdAt: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
        }),
        ctx.db.category.count(),
      ])

      return {
        categories,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      }
    }),

  // Get category by ID
  getById: publicProcedure
    .input(z.object({
      id: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          usageCount: true,
          createdAt: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      })

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        })
      }

      return category
    }),

  // Create new category (merchant can create)
  // Auto-deduplicates if category already exists
  create: merchantProcedure
    .input(z.object({
      name: z.string().min(1).max(50).trim(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const trimmedName = input.name.trim()
      
      // Generate slug
      const slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      // Check if category already exists (case-insensitive)
      const existing = await ctx.db.category.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: "insensitive",
          },
        },
      })

      if (existing) {
        // Increment usage count and return existing
        const updated = await ctx.db.category.update({
          where: { id: existing.id },
          data: {
            usageCount: {
              increment: 1,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            usageCount: true,
          },
        })

        return updated
      }

      // Create new category
      const category = await ctx.db.category.create({
        data: {
          name: trimmedName,
          slug,
          description: input.description,
          usageCount: 1,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          usageCount: true,
        },
      })

      return category
    }),

  // Get popular categories (for suggestions)
  getPopular: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const categories = await ctx.db.category.findMany({
        // Removed the usageCount > 0 filter so all categories show
        // They'll still be sorted by popularity (most used first)
        orderBy: [
          { usageCount: "desc" },
          { name: "asc" }, // Secondary sort by name for categories with same usage
        ],
        take: input.limit,
        select: {
          id: true,
          name: true,
          slug: true,
          usageCount: true,
        },
      })

      return categories
    }),

  // Get category with products (for storefront)
  getWithProducts: publicProcedure
    .input(z.object({
      slug: z.string(),
      merchantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { slug: input.slug },
        include: {
          products: {
            where: {
              status: "ACTIVE",
              deletedAt: null,
              ...(input.merchantId && { merchantId: input.merchantId }),
            },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              price: true,
              images: true,
              featured: true,
            },
            orderBy: [
              { featured: "desc" },
              { popularityScore: "desc" },
            ],
          },
        },
      })

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        })
      }

      return category
    }),

getByMerchant: merchantProcedure
  .query(async ({ ctx }) => {
    const merchantId = ctx.session!.user.id
        
    // Get all available categories
    const allCategories = await ctx.db.category.findMany({
      orderBy: [
        { usageCount: "desc" },
        { name: "asc" }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
      }
    })
    
    // Return in format expected by product form
    return {
      merchant: {
        id: merchantId,
        categories: allCategories
      }
    }
  }),
})