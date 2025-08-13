import { z } from 'zod'
import { router, merchantProcedure } from '../../trpc'
import { paginationSchema, priceSchema, quantitySchema } from '../../utils/validation'
import { paginatedResponse } from '../../utils/pagination'
import { handleDatabaseError } from '../../utils/errors'
import { Prisma, ProductStatus } from '@kitchencloud/database'
import { TRPCError } from '@trpc/server'

export const productRouter = router({
  // List products (merchant view)
  list: merchantProcedure
    .input(paginationSchema.extend({
      status: z.nativeEnum(ProductStatus).optional(),
      categoryId: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        merchantId: ctx.session?.user.id,
        ...(input.status && { status: input.status }),
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ],
        }),
      }
      
      return paginatedResponse(
        ctx.db.product,
        where,
        input,
        {
          category: true,
          _count: { select: { orderItems: true } },
        }
      )
    }),
    
  // Get single product
  get: merchantProcedure
    .input(z.object({
      id: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: {
          id: input.id,
          merchantId: ctx.session?.user.id,
        },
        include: {
          category: true,
          ProductVariant: true,
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            },
          },
        },
      })
      
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      return product
    }),
    
  // Create product
  create: merchantProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      categoryId: z.string().cuid().optional(),
      price: priceSchema,
      comparePrice: priceSchema.optional(),
      sku: z.string().optional(),
      trackQuantity: z.boolean().default(false),
      quantity: quantitySchema.default(0),
      images: z.array(z.string().url()).default([]),
      status: z.nativeEnum(ProductStatus).default('DRAFT'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const slug = input.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

        const data: Prisma.ProductCreateInput = {
          name: input.name,
          description: input.description ?? null,
          slug,
          price: input.price,
          comparePrice: input.comparePrice ?? null,
          sku: input.sku ?? null,
          trackQuantity: input.trackQuantity ?? false,
          quantity: input.quantity ?? 0,
          images: input.images ?? [],
          status: input.status,
          merchant: { connect: { id: ctx.session!.user.id } }, // ← relation connect
          ...(input.categoryId
            ? { category: { connect: { id: input.categoryId } } }
            : {}),
        }
          
        const product = await ctx.db.product.create({ data })
        
        return product
      } catch (error) {
        handleDatabaseError(error)
      }
    }),
    
  // Update product
  update: merchantProcedure
    .input(z.object({
      id: z.string().cuid(),
      data: z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        categoryId: z.string().cuid().nullable().optional(),
        price: priceSchema.optional(),
        comparePrice: priceSchema.nullable().optional(),
        sku: z.string().nullable().optional(),
        trackQuantity: z.boolean().optional(),
        quantity: quantitySchema.optional(),
        images: z.array(z.string().url()).optional(),
        status: z.nativeEnum(ProductStatus).optional(),
        featured: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const existing = await ctx.db.product.findFirst({
          where: {
            id: input.id,
            merchantId: ctx.session?.user.id,
          },
        })
        
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        
        const product = await ctx.db.product.update({
          where: { id: input.id },
          data: input.data,
        })
        
        return product
      } catch (error) {
        handleDatabaseError(error)
      }
    }),
    
  // Delete product (soft delete)
  delete: merchantProcedure
    .input(z.object({
      id: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const existing = await ctx.db.product.findFirst({
          where: {
            id: input.id,
            merchantId: ctx.session?.user.id,
          },
        })
        
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        
        await ctx.db.product.update({
          where: { id: input.id },
          data: {
            deletedAt: new Date(),
            status: 'DISCONTINUED',
          },
        })
        
        return { success: true }
      } catch (error) {
        handleDatabaseError(error)
      }
    }),
    
  // Bulk update
  bulkUpdate: merchantProcedure
    .input(z.object({
      ids: z.array(z.string().cuid()),
      action: z.enum(['activate', 'deactivate', 'delete']),
    }))
    .mutation(async ({ ctx, input }) => {
      const data = {
        activate: { status: 'ACTIVE' as ProductStatus },
        deactivate: { status: 'DRAFT' as ProductStatus },
        delete: { deletedAt: new Date(), status: 'DISCONTINUED' as ProductStatus },
      }[input.action]
      
      await ctx.db.product.updateMany({
        where: {
          id: { in: input.ids },
          merchantId: ctx.session?.user.id,
        },
        data,
      })
      
      return { success: true, count: input.ids.length }
    }),
})