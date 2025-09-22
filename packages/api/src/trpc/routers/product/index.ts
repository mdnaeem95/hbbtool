import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, merchantProcedure } from '../../core'
import { paginationSchema, priceSchema, quantitySchema } from '../../../utils/validation'
import { paginatedResponse } from '../../../utils/pagination'
import { handleDatabaseError } from '../../../utils/errors'
import { Prisma, ProductStatus } from '@homejiak/database'

/** ---------------------------
 *  Helpers
 *  ------------------------ */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product'

async function ensureUniqueProductSlug(db: any, merchantId: string, base: string) {
  let slug = base
  for (let i = 0; i < 50; i++) {
    const exists = await db.product.findFirst({ where: { merchantId, slug }, select: { id: true } })
    if (!exists) return slug
    slug = `${base}-${i + 2}`
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

/** ---------------------------
 *  Zod inputs (accept legacy keys too)
 *  ------------------------ */
const createProductZ = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  categoryId: z.string().cuid().optional(),
  price: priceSchema,
  // accept legacy 'comparePrice' but map to compareAtPrice
  compareAtPrice: priceSchema.optional(),
  comparePrice: priceSchema.optional(), // legacy alias
  sku: z.string().optional(),
  // legacy → new
  trackInventory: z.boolean().optional(),
  trackQuantity: z.boolean().optional(), // legacy alias
  inventory: quantitySchema.optional(),
  quantity: quantitySchema.optional(), // legacy alias
  images: z.array(z.string().url()).default([]),
  status: z.nativeEnum(ProductStatus).default('DRAFT'),
  featured: z.boolean().optional(),
})

const updateProductZ = z.object({
  id: z.string().cuid(),
  data: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    categoryId: z.string().cuid().nullable().optional(),
    price: priceSchema.optional(),
    compareAtPrice: priceSchema.nullable().optional(),
    comparePrice: priceSchema.nullable().optional(), // legacy alias
    sku: z.string().nullable().optional(),
    trackInventory: z.boolean().optional(),
    trackQuantity: z.boolean().optional(), // legacy alias
    inventory: quantitySchema.optional(),
    quantity: quantitySchema.optional(), // legacy alias
    images: z.array(z.string().url()).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    featured: z.boolean().optional(),
  }),
})

/** ---------------------------
 *  Router
 *  ------------------------ */
export const productRouter = router({
  // List products (merchant view)
  list: merchantProcedure
    .input(
      paginationSchema.extend({
        status: z.nativeEnum(ProductStatus).optional(),
        categoryId: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.ProductWhereInput = {
        merchantId: ctx.session!.user.id,
        ...(input.status ? { status: input.status } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { description: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      return paginatedResponse(
        ctx.db.product,
        where,
        input,
        {
          category: true,
          _count: { select: { orderItems: true } },
        },
      )
    }),

  // Get single product
  get: merchantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: { id: input.id, merchantId: ctx.session!.user.id },
        include: {
          category: true,
          variants: true, // ← schema relation name
          _count: { select: { orderItems: true, reviews: true } },
        },
      })

      if (!product) throw new TRPCError({ code: 'NOT_FOUND' })
      return product
    }),

  // Create product
  create: merchantProcedure
    .input(createProductZ)
    .mutation(async ({ ctx, input }) => {
      try {
        const merchantId = ctx.session!.user.id
        const baseSlug = slugify(input.name)
        const slug = await ensureUniqueProductSlug(ctx.db, merchantId, baseSlug)

        // map legacy aliases
        const compareAtPrice = input.compareAtPrice ?? input.comparePrice ?? null
        const trackInventory = input.trackInventory ?? input.trackQuantity ?? false
        const inventory = input.inventory ?? input.quantity ?? 0

        const data: Prisma.ProductCreateInput = {
          name: input.name,
          description: input.description ?? null,
          slug,
          price: input.price,
          compareAtPrice,
          sku: input.sku ?? null,
          trackInventory,
          inventory,
          images: input.images ?? [],
          status: input.status,
          featured: input.featured ?? false,
          merchant: { connect: { id: merchantId } },
          ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
        }

        const product = await ctx.db.product.create({ data })
        return product
      } catch (error) {
        handleDatabaseError(error)
      }
    }),

  // Update product
  update: merchantProcedure
    .input(updateProductZ)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const existing = await ctx.db.product.findFirst({
          where: { id: input.id, merchantId: ctx.session!.user.id },
          select: { id: true, name: true, slug: true },
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

        // map legacy aliases
        const d = input.data
        const compareAtPrice =
          d.compareAtPrice !== undefined ? d.compareAtPrice : d.comparePrice
        const trackInventory =
          d.trackInventory !== undefined ? d.trackInventory : d.trackQuantity
        const inventory = d.inventory !== undefined ? d.inventory : d.quantity

        // If name changes, regen unique slug (per-merchant uniqueness)
        let slugUpdate: { slug?: string } = {}
        if (d.name) {
          const base = slugify(d.name)
          slugUpdate.slug = await ensureUniqueProductSlug(ctx.db, ctx.session!.user.id, base)
        }

        // Handle category connect / disconnect
        const categoryUpdate =
          d.categoryId === undefined
            ? {}
            : d.categoryId === null
            ? { category: { disconnect: true } }
            : { category: { connect: { id: d.categoryId } } }

        const product = await ctx.db.product.update({
          where: { id: input.id },
          data: {
            ...slugUpdate,
            ...(d.name !== undefined ? { name: d.name } : {}),
            ...(d.description !== undefined ? { description: d.description } : {}),
            ...(d.price !== undefined ? { price: d.price } : {}),
            ...(compareAtPrice !== undefined ? { compareAtPrice } : {}),
            ...(d.sku !== undefined ? { sku: d.sku } : {}),
            ...(trackInventory !== undefined ? { trackInventory } : {}),
            ...(inventory !== undefined ? { inventory } : {}),
            ...(d.images !== undefined ? { images: d.images } : {}),
            ...(d.status !== undefined ? { status: d.status } : {}),
            ...(d.featured !== undefined ? { featured: d.featured } : {}),
            ...categoryUpdate,
          },
        })

        return product
      } catch (error) {
        handleDatabaseError(error)
      }
    }),

  // Delete product (soft delete + set status DISCONTINUED)
  delete: merchantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const owned = await ctx.db.product.findFirst({
          where: { id: input.id, merchantId: ctx.session!.user.id },
          select: { id: true },
        })
        if (!owned) throw new TRPCError({ code: 'NOT_FOUND' })

        await ctx.db.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: input.id },
            data: { status: 'DISCONTINUED' },
          })
          // use soft-delete model method provided by the extension
          await (tx as any).Product.softDelete({ id: input.id })
        })

        return { success: true }
      } catch (error) {
        handleDatabaseError(error)
      }
    }),

  // Bulk update
  bulkUpdate: merchantProcedure
    .input(
      z.object({
        ids: z.array(z.string().cuid()).min(1),
        action: z.enum(['activate', 'deactivate', 'delete']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.action === 'delete') {
        // soft delete each + set status
        await ctx.db.$transaction(
          input.ids.map((id) =>
            ctx.db.product.update({ where: { id, merchantId: ctx.session!.user.id }, data: { status: 'DISCONTINUED' } }),
          ),
        )
        await ctx.db.$transaction(input.ids.map((id) => (ctx.db as any).Product.softDelete({ id })))
        return { success: true, count: input.ids.length }
      }

      const data =
        input.action === 'activate'
          ? { status: 'ACTIVE' as ProductStatus }
          : { status: 'DRAFT' as ProductStatus }

      await ctx.db.product.updateMany({
        where: { id: { in: input.ids }, merchantId: ctx.session!.user.id },
        data,
      })

      return { success: true, count: input.ids.length }
    }),
})