import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../../core'

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1, "Variant name is required"),
  options: z.record(z.string(), z.any()).default({}),
  priceAdjustment: z.number().default(0),
  inventory: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  imageUrl: z.string().url().optional().nullable(),
})

export const productVariantsRouter = router({
  // Get product with variants for editing
  getProductWithVariants: protectedProcedure
    .input(z.object({ 
      productId: z.string().cuid() 
    }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: {
          id: input.productId,
          merchantId: ctx.session?.user.id,
          deletedAt: null,
        },
        include: {
          variants: {
            orderBy: { sortOrder: 'asc' },
          },
          modifierGroups: {
            include: {
              modifiers: {
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          category: true,
        },
      })

      if (!product) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Product not found' 
        })
      }

      return product
    }),

  upsertVariants: protectedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      variants: z.array(variantSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session?.user.id
      
      // Verify product ownership
      const product = await ctx.db.product.findFirst({
        where: { 
          id: input.productId,
          merchantId,
          deletedAt: null,
        }
      })
      
      if (!product) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Product not found or unauthorized'
        })
      }
      
      // Ensure at least one variant is default
      const hasDefault = input.variants.some(v => v.isDefault)
      if (!hasDefault && input.variants.length > 0) {
        input.variants[0]!.isDefault = true
      }
      
      // Use transaction for data consistency
      return await ctx.db.$transaction(async (tx) => {
        // Get existing variants
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: input.productId },
          select: { id: true }
        })
        
        const existingIds = existingVariants.map(v => v.id)
        const inputIds = input.variants
          .filter(v => v.id && !v.id.startsWith('new-'))
          .map(v => v.id!)
        
        // Delete variants that are no longer in the list
        const toDelete = existingIds.filter(id => !inputIds.includes(id))
        if (toDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: toDelete } }
          })
        }
        
        // Upsert each variant
        const results = []
        for (const variant of input.variants) {
          const isNew = !variant.id || variant.id.startsWith('new-')
          
          if (isNew) {
            // Create new variant
            const created = await tx.productVariant.create({
              data: {
                productId: input.productId,
                sku: variant.sku || null,
                name: variant.name,
                options: variant.options,
                priceAdjustment: variant.priceAdjustment,
                inventory: variant.inventory,
                isDefault: variant.isDefault,
                sortOrder: variant.sortOrder,
                imageUrl: variant.imageUrl || null,
              }
            })
            results.push(created)
          } else {
            // Update existing variant
            const updated = await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku || null,
                name: variant.name,
                options: variant.options,
                priceAdjustment: variant.priceAdjustment,
                inventory: variant.inventory,
                isDefault: variant.isDefault,
                sortOrder: variant.sortOrder,
                imageUrl: variant.imageUrl || null,
                updatedAt: new Date(),
              }
            })
            results.push(updated)
          }
        }
        
        // Ensure only one default variant exists
        if (results.some(v => v.isDefault)) {
          const defaultVariant = results.find(v => v.isDefault)
          await tx.productVariant.updateMany({
            where: {
              productId: input.productId,
              id: { not: defaultVariant!.id }
            },
            data: { isDefault: false }
          })
        }
        
        return {
          success: true,
          variantCount: results.length,
          variants: results
        }
      })
    }),

  // Create or update product with variants
  upsertProductWithVariants: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      categoryId: z.string().cuid().optional(),
      sku: z.string().optional(),
      price: z.number().positive(),
      compareAtPrice: z.number().positive().optional(),
      images: z.array(z.string()).default([]),
      trackInventory: z.boolean().default(false),
      inventory: z.number().int().min(0).default(0),
      status: z.enum(['DRAFT', 'ACTIVE', 'SOLD_OUT', 'DISCONTINUED']).default('ACTIVE'),
      featured: z.boolean().default(false),
      // Food specific
      allergens: z.array(z.string()).default([]),
      dietaryInfo: z.array(z.string()).default([]),
      preparationTime: z.number().int().optional(),
      servingSize: z.string().optional(),
      // Variants
      variants: z.array(variantSchema).default([]),
      deleteVariantIds: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session?.user.id
      const { variants, deleteVariantIds, ...productData } = input

      // Use transaction for atomicity
      return await ctx.db.$transaction(async (tx) => {
        // Create or update product
        let product
        if (input.id) {
          // Update existing product
          product = await tx.product.update({
            where: { 
              id: input.id,
              merchantId,
            },
            data: {
              ...productData,
              updatedAt: new Date(),
            },
          })
        } else {
          // Create new product
          product = await tx.product.create({
            data: {
              ...productData,
              merchantId: merchantId!,
              slug: generateSlug(productData.name),
            },
          })
        }

        // Delete variants marked for deletion
        if (deleteVariantIds.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              id: { in: deleteVariantIds },
              productId: product.id,
            },
          })
        }

        // Process variants
        if (variants.length > 0) {
          // Ensure only one default variant
          const hasDefault = variants.some(v => v.isDefault)
          if (!hasDefault) {
            variants[0]!.isDefault = true
          }

          // Update or create variants
          for (const variant of variants) {
            if (variant.id && !variant.id.startsWith('new-')) {
              // Update existing variant
              await tx.productVariant.update({
                where: { 
                  id: variant.id,
                  productId: product.id,
                },
                data: {
                  sku: variant.sku || null,
                  name: variant.name,
                  options: variant.options,
                  priceAdjustment: variant.priceAdjustment,
                  inventory: variant.inventory,
                  isDefault: variant.isDefault,
                  sortOrder: variant.sortOrder,
                  imageUrl: variant.imageUrl || null,
                  updatedAt: new Date(),
                },
              })
            } else {
              // Create new variant
              await tx.productVariant.create({
                data: {
                  productId: product.id,
                  sku: variant.sku || null,
                  name: variant.name,
                  options: variant.options,
                  priceAdjustment: variant.priceAdjustment,
                  inventory: variant.inventory,
                  isDefault: variant.isDefault,
                  sortOrder: variant.sortOrder,
                  imageUrl: variant.imageUrl || null,
                },
              })
            }
          }

          // Ensure only one default variant
          const defaultVariants = await tx.productVariant.findMany({
            where: { 
              productId: product.id,
              isDefault: true,
            },
          })

          if (defaultVariants.length > 1) {
            // Keep only the first as default
            await tx.productVariant.updateMany({
              where: {
                productId: product.id,
                id: { 
                  notIn: [defaultVariants[0]!.id] 
                },
              },
              data: { 
                isDefault: false 
              },
            })
          }
        }

        // Return updated product with variants
        return await tx.product.findUnique({
          where: { id: product.id },
          include: {
            variants: {
              orderBy: { sortOrder: 'asc' },
            },
            category: true,
          },
        })
      })
    }),

  // Update variant inventory (for quick stock adjustments)
  updateVariantInventory: protectedProcedure
    .input(z.object({
      variantId: z.string().cuid(),
      inventory: z.number().int().min(0),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const variant = await ctx.db.productVariant.findFirst({
        where: {
          id: input.variantId,
        },
        include: {
          product: {
            select: {
              merchantId: true,
              name: true,
            },
          },
        },
      })

      if (!variant || variant.product.merchantId !== ctx.session?.user.id) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Variant not found' 
        })
      }

      // Update inventory
      const updated = await ctx.db.productVariant.update({
        where: { id: input.variantId },
        data: { 
          inventory: input.inventory,
          updatedAt: new Date(),
        },
      })

      // Log inventory change
      await ctx.db.inventoryLog.create({
        data: {
          productId: variant.productId,
          type: 'ADJUSTMENT',
          quantity: input.inventory - variant.inventory,
          reason: input.reason || `Manual adjustment for variant: ${variant.name}`,
          previousStock: variant.inventory,
          newStock: input.inventory,
          createdBy: ctx.session.user.id,
        },
      })

      return updated
    }),

  // Bulk update variant prices
  bulkUpdateVariantPrices: protectedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      adjustmentType: z.enum(['FIXED', 'PERCENTAGE']),
      adjustmentValue: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const product = await ctx.db.product.findFirst({
        where: {
          id: input.productId,
          merchantId: ctx.session?.user.id,
        },
        include: {
          variants: true,
        },
      })

      if (!product) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Product not found' 
        })
      }

      // Calculate new price adjustments
      const updates = product.variants.map(variant => {
        let newAdjustment: number
        
        if (input.adjustmentType === 'FIXED') {
          newAdjustment = Number(variant.priceAdjustment) + input.adjustmentValue
        } else {
          // Percentage adjustment
          const currentPrice = Number(product.price) + Number(variant.priceAdjustment)
          const change = currentPrice * (input.adjustmentValue / 100)
          newAdjustment = Number(variant.priceAdjustment) + change
        }

        return {
          id: variant.id,
          priceAdjustment: newAdjustment,
        }
      })

      // Update all variants
      await ctx.db.$transaction(
        updates.map(update => 
          ctx.db.productVariant.update({
            where: { id: update.id },
            data: { 
              priceAdjustment: update.priceAdjustment,
              updatedAt: new Date(),
            },
          })
        )
      )

      return { 
        success: true, 
        updatedCount: updates.length 
      }
    }),

  // Delete a variant
  deleteVariant: protectedProcedure
    .input(z.object({
      variantId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership and check if it's not the only variant
      const variant = await ctx.db.productVariant.findFirst({
        where: {
          id: input.variantId,
        },
        include: {
          product: {
            include: {
              variants: true,
            },
          },
        },
      })

      if (!variant || variant.product.merchantId !== ctx.session?.user.id) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Variant not found' 
        })
      }

      if (variant.product.variants.length <= 1) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Cannot delete the only variant. Products must have at least one variant.' 
        })
      }

      // If deleting default variant, make another one default
      if (variant.isDefault) {
        const nextVariant = variant.product.variants.find(v => v.id !== variant.id)
        if (nextVariant) {
          await ctx.db.productVariant.update({
            where: { id: nextVariant.id },
            data: { isDefault: true },
          })
        }
      }

      // Delete the variant
      await ctx.db.productVariant.delete({
        where: { id: input.variantId },
      })

      return { success: true }
    }),
})

// Helper function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}