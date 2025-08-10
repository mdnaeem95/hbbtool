import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc"

const createCategoryInput = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  image: z.string().url().optional(), // we'll map this to imageUrl
  sortOrder: z.number().int().default(0),
})

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function requireMerchantId(ctx: { session?: { user?: { id: string; role: "MERCHANT" | "CUSTOMER" }}}) {
  const u = ctx.session?.user
  if (!u || u.role !== "MERCHANT") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Merchant session required" })
  }
  return u.id // this is the merchant.id
}

export const categoryRouter = createTRPCRouter({
  // List categories for a merchant
  list: publicProcedure
    .input(
      z.object({
        merchantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const categories = await ctx.db.category.findMany({
        where: {
          merchantId: input.merchantId,
          isActive: true,
          deletedAt: null,
        },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: {
              products: {
                where: {
                  status: "ACTIVE",
                  deletedAt: null,
                },
              },
            },
          },
        },
      })

      return categories.map((category) => ({
        ...category,
        productCount: category._count.products,
      }))
    }),

  // Create category (merchant only)
  create: protectedProcedure
    .input(createCategoryInput)
    .mutation(async ({ ctx, input }) => {
      const merchantId = requireMerchantId(ctx)

      const baseSlug = toSlug(input.name)
      let slug = baseSlug

      for (let i = 0; i < 3; i++) {
        try {
            const category = await ctx.db.category.create({
                data: {
                    merchantId,
                    name: input.name,
                    slug,
                    description: input.description,
                    imageUrl: input.image,
                    sortOrder: input.sortOrder ?? 0
                },
            })
            return category
        } catch (err: any) {
            if (err?.code === "P2002" && err?.meta?.target?.includes("Category_merchantId-slug-key")) {
                slug = `${baseSlug}-${Math.floor(Math.random() * 1e6).toString().padStart(6, "0")}`
                continue
            }
            throw err
        }
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not allocate a unique slug" })
    }),

  // Update category (merchant only)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        image: z.string().url().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
        const merchantId = requireMerchantId(ctx)
        const { id, image, ...data } = input

        // Verify ownership
        const existing = await ctx.db.category.findUnique({
            where: { id },
            select: { id: true, name: true, slug: true, merchantId: true },
        })

        if (!existing || existing.merchantId !== merchantId) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Category not found or you don't have permission"
            })
        }

        // update slug if name changed
        const baseSlug =
            data.name && data.name !== existing.name
                ? toSlug(data.name)
                : existing.slug
        
        let slug = baseSlug
        let updated

        for (let i = 0; i < 3; i++) {
            try {
                updated = await ctx.db.category.update({
                    where: { id },
                    data: {
                        ...data,
                        ...(image !== undefined ? { imageUrl: image }: {}),
                        slug
                    },
                })
                break
            } catch (err: any) {
                if (err?.code === "P2002" && err?.meta?.target?.includes("merchantId_slug")) {
                    slug = `${baseSlug}-${Math.floor(Math.random() * 1e6).toString().padStart(6, "0")}`
                    continue
                }
                throw err
            }
        }
        if (!updated) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Could not allocate a unique slug. Please try again.",
            })
        }

        // if need product count, compute and return
        const productCount = await ctx.db.product.count({
            where: { categoryId: id, status: "ACTIVE", deletedAt: null },
        })

        return { ...updated, productCount }
    }),

  // Delete category (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
        const merchantId = requireMerchantId(ctx)

        // Verify ownership
        const category = await ctx.db.category.findUnique({
            where: { id: input.id },
            select: { id: true, merchantId: true, deletedAt: true }
        })

        if (!category || category.merchantId !== merchantId || category.deletedAt) {
            throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found or you don't have permission",
            })
        }

        // Prevent deletion if category has products
        const productCount = await ctx.db.product.count({
            where: { categoryId: input.id, deletedAt: null },
        })
        if (productCount > 0) {
            throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot delete category with products",
            })
        }

        await ctx.db.category.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
        })

        return { success: true }
    }),

  // Reorder categories
  reorder: protectedProcedure
    .input(z.object({ categoryIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
        const merchantId = requireMerchantId(ctx)

        // basic input sanity
        const ids = input.categoryIds
        const uniqueIds = new Set(ids)
        if (uniqueIds.size !== ids.length) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Duplicate category IDs in payload"
            })
        }

        // very ownership and existence
        const owned = await ctx.db.category.findMany({
            where: { id: { in: ids }, merchantId, deletedAt: null },
            select: { id: true }
        })
        if (owned.length !== ids.length) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "One or more categories are missing or not owned by this merchant"
            })
        }

        // apply new sortOrder in a single transaction
        await ctx.db.$transaction(
            ids.map((id, index) => 
                ctx.db.category.update({
                    where: { id },
                    data: { sortOrder: index }
                })
            )
        )

        return { success: true }
    }),
})