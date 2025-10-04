import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, merchantProcedure, publicProcedure } from '../../core'
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
  categoryId: z.uuid().optional(),
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
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  featured: z.boolean().optional(),
})

const updateProductZ = z.object({
  id: z.string().cuid(),
  data: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    categoryId: z.uuid().optional(),
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

  getWithModifiers: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            }
          },
          category: true,
          variants: true,
          modifierGroups: {
            where: { isActive: true },
            include: {
              modifiers: {
                where: { isAvailable: true },
                orderBy: { sortOrder: 'asc' }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
      }

      return product
    }),

duplicate: merchantProcedure
  .input(z.object({ 
    id: z.string().cuid(),
    includeModifiers: z.boolean().default(true),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      const merchantId = ctx.session!.user.id;
      
      // Get the original product with all its relations
      const original = await ctx.db.product.findFirst({
        where: { 
          id: input.id, 
          merchantId 
        },
        include: {
          category: true,
          variants: true,
          modifierGroups: {
            include: {
              modifiers: true
            }
          }
        }
      });

      if (!original) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Product not found' 
        });
      }

      // Extract base name (remove existing copy suffix if present)
      let baseName = original.name;
      const copyMatch = baseName.match(/^(.*?)\s*\(Copy\s*\d*\)$/);
      if (copyMatch) {
        baseName = copyMatch[1]?.trim()!;
      }

      // Find all existing copies to determine the next number
      const existingCopies = await ctx.db.product.findMany({
        where: {
          merchantId,
          OR: [
            { name: `${baseName} (Copy)` },
            { name: { startsWith: `${baseName} (Copy ` } }
          ]
        },
        select: { name: true },
        orderBy: { name: 'asc' }
      });

      // Determine the next copy number
      let copyNumber = 1;
      if (existingCopies.length > 0) {
        // Extract numbers from existing copy names
        const numbers = existingCopies.map(p => {
          if (p.name === `${baseName} (Copy)`) return 1;
          const match = p.name.match(/\(Copy (\d+)\)$/);
          return match ? parseInt(match[1]!, 10) : 0;
        }).filter(n => n > 0);
        
        if (numbers.length > 0) {
          copyNumber = Math.max(...numbers) + 1;
        }
      }
      
      const newName = copyNumber === 1 && !existingCopies.some(p => p.name === `${baseName} (Copy)`)
        ? `${baseName} (Copy)`
        : `${baseName} (Copy ${copyNumber})`;
      
      const baseSlug = slugify(newName);
      const newSlug = await ensureUniqueProductSlug(ctx.db, merchantId, baseSlug);

      // Generate unique SKU
      let newSku = null;
      if (original.sku) {
        // Remove any existing -copy suffix
        let baseSku = original.sku;
        const skuCopyMatch = baseSku.match(/^(.*?)(-copy(-\d+)?)?$/);
        if (skuCopyMatch) {
          baseSku = skuCopyMatch[1]!;
        }

        // Find existing SKU copies
        const existingSkus = await ctx.db.product.findMany({
          where: {
            merchantId,
            sku: {
              startsWith: baseSku,
              contains: '-copy'
            }
          },
          select: { sku: true }
        });

        let skuNumber = 1;
        if (existingSkus.length > 0) {
          const skuNumbers = existingSkus.map(p => {
            if (p.sku === `${baseSku}-copy`) return 1;
            const match = p.sku?.match(/-copy-(\d+)$/);
            return match ? parseInt(match[1]!, 10) : 0;
          }).filter(n => n > 0);
          
          if (skuNumbers.length > 0) {
            skuNumber = Math.max(...skuNumbers) + 1;
          }
        }

        newSku = skuNumber === 1 && !existingSkus.some(p => p.sku === `${baseSku}-copy`)
          ? `${baseSku}-copy`
          : `${baseSku}-copy-${skuNumber}`;
      }

      // Create the duplicated product in a transaction
      const duplicatedProduct = await ctx.db.$transaction(async (tx) => {
        // Create the new product
        const newProduct = await tx.product.create({
          data: {
            merchantId,
            name: newName,
            slug: newSlug,
            description: original.description,
            sku: newSku,
            categoryId: original.categoryId,
            images: original.images,
            
            // Pricing
            price: original.price,
            compareAtPrice: original.compareAtPrice,
            cost: original.cost,
            profitMargin: original.profitMargin,
            
            // Inventory
            trackInventory: original.trackInventory,
            inventory: original.inventory,
            lowStockThreshold: original.lowStockThreshold,
            allowBackorder: original.allowBackorder,
            
            // Status - set to DRAFT so merchant can review
            status: 'DRAFT',
            featured: false, // Don't auto-feature duplicates
            sortOrder: original.sortOrder,
            
            // Food specific
            allergens: original.allergens,
            dietaryInfo: original.dietaryInfo,
            spiceLevel: original.spiceLevel,
            servingSize: original.servingSize,
            calories: original.calories,
            ingredients: original.ingredients,
            
            // Preparation & Storage
            preparationTime: original.preparationTime,
            preparationMethod: original.preparationMethod,
            shelfLife: original.shelfLife,
            storageInstructions: original.storageInstructions,
            reheatingInstructions: original.reheatingInstructions,
            
            // Scheduling
            availableDays: original.availableDays,
            blackoutDates: original.blackoutDates,
            maxDailyQuantity: original.maxDailyQuantity,
            maxPerOrder: original.maxPerOrder,
            minPerOrder: original.minPerOrder,
            requirePreorder: original.requirePreorder,
            preorderDays: original.preorderDays,
            
            // SEO
            metaTitle: original.metaTitle ? `${original.metaTitle} (Copy)` : null,
            metaDescription: original.metaDescription,
            
            // Other metadata
            tags: original.tags,
          }
        });

        // Duplicate variants if they exist
        if (original.variants && original.variants.length > 0) {
          for (const variant of original.variants) {
            let variantSku = null;
            if (variant.sku) {
              // Make variant SKU unique
              variantSku = `${variant.sku}-copy-${Date.now()}`;
            }
            
            await tx.productVariant.create({
              data: {
                productId: newProduct.id,
                sku: variantSku,
                name: variant.name,
                options: variant.options as any,
                priceAdjustment: variant.priceAdjustment,
                inventory: variant.inventory,
                isDefault: variant.isDefault,
                sortOrder: variant.sortOrder,
                imageUrl: variant.imageUrl,
              }
            });
          }
        }

        // Duplicate modifier groups and modifiers if requested
        if (input.includeModifiers && original.modifierGroups.length > 0) {
          for (const group of original.modifierGroups) {
            const newGroup = await tx.productModifierGroup.create({
              data: {
                productId: newProduct.id,
                merchantId: merchantId,
                name: group.name,
                description: group.description,
                type: group.type,
                required: group.required,
                minSelect: group.minSelect,
                maxSelect: group.maxSelect,
                sortOrder: group.sortOrder,
                isActive: group.isActive,
              }
            });

            // Create modifiers for this group
            if (group.modifiers && group.modifiers.length > 0) {
              await tx.productModifier.createMany({
                data: group.modifiers.map(modifier => ({
                  groupId: newGroup.id,
                  name: modifier.name,
                  description: modifier.description,
                  priceAdjustment: modifier.priceAdjustment,
                  priceType: modifier.priceType,
                  variantPricing: modifier.variantPricing ?? undefined,
                  trackInventory: modifier.trackInventory,
                  inventory: modifier.inventory,
                  maxPerOrder: modifier.maxPerOrder,
                  caloriesAdjustment: modifier.caloriesAdjustment,
                  imageUrl: modifier.imageUrl,
                  sortOrder: modifier.sortOrder,
                  isDefault: modifier.isDefault,
                  isAvailable: modifier.isAvailable,
                  isHidden: modifier.isHidden,
                  incompatibleWith: modifier.incompatibleWith || [],
                  requiredWith: modifier.requiredWith || [],
                }))
              });
            }
          }
        }

        return newProduct;
      }, {
        timeout: 10000, // 10 second timeout for the transaction
      });

      // Track the duplication event for analytics
      await ctx.db.analytics.create({
        data: {
          merchantId,
          event: 'product_duplicated',
          category: 'product_management',
          properties: {
            originalProductId: original.id,
            originalProductName: original.name,
            duplicatedProductId: duplicatedProduct.id,
            duplicatedProductName: duplicatedProduct.name,
            includeModifiers: input.includeModifiers,
          },
        }
      }).catch(() => {}); // Don't fail if analytics fails

      return duplicatedProduct;
    } catch (error) {
      // Better error handling
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Handle Prisma unique constraint errors
      if ((error as any)?.code === 'P2002') {
        const target = (error as any)?.meta?.target;
        if (target?.includes('name')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A product with this name already exists. Please try again.',
          });
        }
        if (target?.includes('sku')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A product with this SKU already exists. Please try again.',
          });
        }
        if (target?.includes('slug')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A product with this URL slug already exists. Please try again.',
          });
        }
      }
      
      console.error('Error duplicating product:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to duplicate product. Please try again.',
      });
    }
  }),
})