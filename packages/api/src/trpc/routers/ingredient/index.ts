import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, merchantProcedure } from "../../core"
import { Prisma } from "@homejiak/database"
import { getMerchantPricingId } from "../../../services/ingredients"
import { updateAllRecipeCosts, updateRecipeCostsForCustomIngredient, updateRecipeCostsForIngredient } from "../../../services/recipe"
import { IngredientCategory, MeasurementUnit, IngredientByIdDto } from '@homejiak/types'

// Validation schemas based on actual schema
const createCustomIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(IngredientCategory),
  purchaseUnit: z.enum(MeasurementUnit),
  currentPricePerUnit: z.number().positive(),
  preferredStore: z.string().optional(),
  currentStock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).optional(),
  shelfLifeDays: z.number().int().positive().optional(),
  allergens: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

const updateMerchantPriceSchema = z.object({
  ingredientId: z.string(),
  currentPricePerUnit: z.number().positive(),
  preferredStore: z.string().optional(),
  brandPreference: z.string().optional(),
  currentStock: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQuantity: z.number().positive().optional(),
  notes: z.string().optional(),
})

export const ingredientRouter = router({
  // Get all ingredients (global library + merchant custom)
  getAll: merchantProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      category: z.enum(IngredientCategory).optional(),
      includeCustom: z.boolean().default(true),
      includeGlobal: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id
      const skip = (input.page - 1) * input.limit

      // Get global ingredients with merchant pricing
      const globalIngredientsPromise = input.includeGlobal 
        ? ctx.db.ingredient.findMany({
            where: {
              isActive: true,
              ...(input.search && {
                name: { contains: input.search, mode: 'insensitive' },
              }),
              ...(input.category && { category: input.category }),
            },
            skip,
            take: input.limit,
            include: {
              merchantPricing: {
                where: { merchantId },
                take: 1,
              },
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([])

      // Get custom ingredients
      const customIngredientsPromise = input.includeCustom
        ? ctx.db.customIngredient.findMany({
            where: {
              merchantId,
              ...(input.search && {
                name: { contains: input.search, mode: 'insensitive' },
              }),
              ...(input.category && { category: input.category }),
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([])

      const [globalIngredients, customIngredients] = await Promise.all([
        globalIngredientsPromise,
        customIngredientsPromise,
      ])

      // Format response combining both types
      const formattedIngredients = [
        ...globalIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          description: ing.description,
          category: ing.category,
          purchaseUnit: ing.purchaseUnit,
          isGlobal: true,
          isCustom: false,
          // Use merchant pricing if available, otherwise reference price
          pricePerUnit: ing.merchantPricing[0] 
            ? Number(ing.merchantPricing[0].currentPricePerUnit.toString())
            : Number(ing.referencePrice.toString()),
          currentStock: ing.merchantPricing[0]
            ? Number(ing.merchantPricing[0].currentStock.toString())
            : 0,
          preferredStore: ing.merchantPricing[0]?.preferredStore,
          reorderPoint: ing.merchantPricing[0]?.reorderPoint
            ? Number(ing.merchantPricing[0]!.reorderPoint!.toString())
            : null,
          allergens: ing.allergens,
          shelfLifeDays: ing.shelfLifeDays,
        })),
        ...customIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          description: ing.description,
          category: ing.category,
          purchaseUnit: ing.purchaseUnit,
          isGlobal: false,
          isCustom: true,
          pricePerUnit: Number(ing.currentPricePerUnit.toString()),
          currentStock: Number(ing.currentStock.toString()),
          preferredStore: ing.preferredStore,
          reorderPoint: ing.reorderPoint ? Number(ing.reorderPoint.toString()) : null,
          allergens: ing.allergens || [],
          shelfLifeDays: ing.shelfLifeDays,
        })),
      ]

      // Sort combined results
      formattedIngredients.sort((a, b) => a.name.localeCompare(b.name))

      const total = formattedIngredients.length // Simplified for demo

      return {
        ingredients: formattedIngredients,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      }
    }),

  // Get single ingredient (global or custom)
  getById: merchantProcedure
    .input(z.object({
      id: z.string(),
      isCustom: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }): Promise<IngredientByIdDto> => {
      const merchantId = ctx.merchant.id

      if (input.isCustom) {
        const ingredient = await ctx.db.customIngredient.findFirst({
          where: { id: input.id, merchantId },
          include: {
            recipeUsages: {
              include: { recipe: { select: { id: true, name: true } } },
              take: 10,
            },
          },
        })

        if (!ingredient) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Custom ingredient not found" })
        }

        return {
          id: ingredient.id,
          name: ingredient.name,
          description: ingredient.description ?? null,
          category: ingredient.category as IngredientCategory,
          purchaseUnit: ingredient.purchaseUnit as MeasurementUnit,

          currentPricePerUnit: Number(ingredient.currentPricePerUnit.toString()),
          currentStock: Number(ingredient.currentStock.toString()),
          preferredStore: ingredient.preferredStore ?? null,
          reorderPoint: ingredient.reorderPoint ? Number(ingredient.reorderPoint.toString()) : null,
          shelfLifeDays: ingredient.shelfLifeDays ?? null,
          allergens: ingredient.allergens ?? [],
          notes: ingredient.notes ?? null,

          isCustom: true as const,
          isGlobal: false as const,

          recipeUsages: ingredient.recipeUsages.map((u) => ({
            id: u.id,
            recipe: { id: u.recipe.id, name: u.recipe.name },
          })),
        }
      }

      // Global ingredient branch
      const ingredient = await ctx.db.ingredient.findUnique({
        where: { id: input.id },
        include: {
          merchantPricing: {
            where: { merchantId },
            include: {
              priceHistory: { orderBy: { purchaseDate: "desc" }, take: 10 },
            },
            take: 1,
          },
          recipeUsages: {
            where: { recipe: { merchantId } },
            include: { recipe: { select: { id: true, name: true } } },
            take: 10,
          },
        },
      })

      if (!ingredient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ingredient not found" })
      }

      const mp = ingredient.merchantPricing[0]

      return {
        id: ingredient.id,
        name: ingredient.name,
        description: ingredient.description ?? null,
        category: ingredient.category as IngredientCategory,
        purchaseUnit: ingredient.purchaseUnit as MeasurementUnit,

        pricePerUnit: mp
          ? Number(mp.currentPricePerUnit.toString())
          : Number(ingredient.referencePrice.toString()),
        currentStock: mp ? Number(mp.currentStock.toString()) : 0,

        isCustom: false as const,
        isGlobal: true as const,

        merchantPricing: mp
          ? {
              id: mp.id,
              currentPricePerUnit: Number(mp.currentPricePerUnit.toString()),
              currentStock: Number(mp.currentStock.toString()),
              preferredStore: mp.preferredStore ?? null,
              brandPreference: mp.brandPreference ?? null,
              priceHistory: mp.priceHistory.map((ph) => ({
                id: ph.id,
                pricePerUnit: Number(ph.pricePerUnit.toString()),
                totalPaid: Number(ph.totalPaid.toString()),
                purchaseDate: ph.purchaseDate,
                store: ph.store ?? null,
                notes: ph.notes ?? null,
              })),
            }
          : undefined,

        recipeUsages: ingredient.recipeUsages.map((u) => ({
          id: u.id,
          recipe: { id: u.recipe.id, name: u.recipe.name },
        })),
      }
    }),

  // Create custom ingredient (merchant-specific)
  createCustom: merchantProcedure
    .input(createCustomIngredientSchema)
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id

      // Check for duplicate names within merchant's custom ingredients
      const existing = await ctx.db.customIngredient.findFirst({
        where: {
          name: input.name,
          merchantId,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A custom ingredient with this name already exists',
        })
      }

      const ingredient = await ctx.db.customIngredient.create({
        data: {
          ...input,
          merchantId,
          currentPricePerUnit: new Prisma.Decimal(input.currentPricePerUnit),
          currentStock: new Prisma.Decimal(input.currentStock),
          reorderPoint: input.reorderPoint 
            ? new Prisma.Decimal(input.reorderPoint)
            : null,
        },
      })

      return {
        ...ingredient,
        currentPricePerUnit: Number(ingredient.currentPricePerUnit.toString()),
        currentStock: Number(ingredient.currentStock.toString()),
      }
    }),

  // Update merchant pricing for global ingredient
  updateMerchantPricing: merchantProcedure
    .input(updateMerchantPriceSchema)
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id
      const { ingredientId, ...priceData } = input

      // Check if ingredient exists
      const ingredient = await ctx.db.ingredient.findUnique({
        where: { id: ingredientId },
      })

      if (!ingredient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ingredient not found',
        })
      }

      // Upsert merchant pricing
      const merchantPricing = await ctx.db.merchantIngredientPrice.upsert({
        where: {
          merchantId_ingredientId: {
            merchantId,
            ingredientId,
          },
        },
        create: {
          merchantId,
          ingredientId,
          currentPricePerUnit: new Prisma.Decimal(priceData.currentPricePerUnit),
          currentPriceDate: new Date(),
          preferredStore: priceData.preferredStore,
          brandPreference: priceData.brandPreference,
          currentStock: priceData.currentStock 
            ? new Prisma.Decimal(priceData.currentStock)
            : new Prisma.Decimal(0),
          reorderPoint: priceData.reorderPoint
            ? new Prisma.Decimal(priceData.reorderPoint)
            : null,
          reorderQuantity: priceData.reorderQuantity
            ? new Prisma.Decimal(priceData.reorderQuantity)
            : null,
          notes: priceData.notes,
        },
        update: {
          currentPricePerUnit: new Prisma.Decimal(priceData.currentPricePerUnit),
          currentPriceDate: new Date(),
          ...(priceData.preferredStore && { preferredStore: priceData.preferredStore }),
          ...(priceData.brandPreference && { brandPreference: priceData.brandPreference }),
          ...(priceData.currentStock !== undefined && {
            currentStock: new Prisma.Decimal(priceData.currentStock),
          }),
          ...(priceData.reorderPoint !== undefined && {
            reorderPoint: new Prisma.Decimal(priceData.reorderPoint),
          }),
          ...(priceData.reorderQuantity !== undefined && {
            reorderQuantity: new Prisma.Decimal(priceData.reorderQuantity),
          }),
          ...(priceData.notes && { notes: priceData.notes }),
        },
      })

      // Add to price history
      await ctx.db.ingredientPriceHistory.create({
        data: {
          merchantPricingId: merchantPricing.id,
          pricePerUnit: new Prisma.Decimal(priceData.currentPricePerUnit),
          purchaseQuantity: new Prisma.Decimal(1),
          totalPaid: new Prisma.Decimal(priceData.currentPricePerUnit),
          store: priceData.preferredStore,
          purchaseDate: new Date(),
        },
      })

      // Update recipe costs that use this ingredient
      await updateRecipeCostsForIngredient(ctx, ingredientId, merchantId)

      return {
        ...merchantPricing,
        currentPricePerUnit: Number(merchantPricing.currentPricePerUnit.toString()),
        currentStock: Number(merchantPricing.currentStock.toString()),
      }
    }),

  // Update custom ingredient
  updateCustom: merchantProcedure
    .input(z.object({
      id: z.string(),
      ...createCustomIngredientSchema.shape,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input
      const merchantId = ctx.merchant.id

      // Verify ingredient belongs to merchant
      const existing = await ctx.db.customIngredient.findFirst({
        where: {
          id,
          merchantId,
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Custom ingredient not found',
        })
      }

      const ingredient = await ctx.db.customIngredient.update({
        where: { id },
        data: {
          ...updateData,
          currentPricePerUnit: new Prisma.Decimal(updateData.currentPricePerUnit),
          currentStock: new Prisma.Decimal(updateData.currentStock),
          reorderPoint: updateData.reorderPoint
            ? new Prisma.Decimal(updateData.reorderPoint)
            : null,
        },
      })

      // Update recipe costs that use this custom ingredient
      await updateRecipeCostsForCustomIngredient(ctx, id, merchantId)

      return {
        ...ingredient,
        currentPricePerUnit: Number(ingredient.currentPricePerUnit.toString()),
        currentStock: Number(ingredient.currentStock.toString()),
      }
    }),

  // Delete custom ingredient
  deleteCustom: merchantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id

      // Verify ingredient belongs to merchant
      const ingredient = await ctx.db.customIngredient.findFirst({
        where: {
          id: input.id,
          merchantId,
        },
        include: {
          recipeUsages: true,
        },
      })

      if (!ingredient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Custom ingredient not found',
        })
      }

      // Check if ingredient is in use
      if (ingredient.recipeUsages.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `This ingredient is used in ${ingredient.recipeUsages.length} recipe(s). Remove it from all recipes before deleting.`,
        })
      }

      await ctx.db.customIngredient.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Bulk update merchant prices
  bulkUpdatePrices: merchantProcedure
    .input(z.object({
      updates: z.array(z.object({
        ingredientId: z.string(),
        isCustom: z.boolean().default(false),
        pricePerUnit: z.number().positive(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id

      // Separate custom and global ingredients
      const customUpdates = input.updates.filter(u => u.isCustom)
      const globalUpdates = input.updates.filter(u => !u.isCustom)

      // Update custom ingredients
      for (const update of customUpdates) {
        await ctx.db.customIngredient.update({
          where: { 
            id: update.ingredientId,
            merchantId, // Ensure it belongs to merchant
          },
          data: {
            currentPricePerUnit: new Prisma.Decimal(update.pricePerUnit),
          },
        })
      }

      // Update merchant pricing for global ingredients
      for (const update of globalUpdates) {
        await ctx.db.merchantIngredientPrice.upsert({
          where: {
            merchantId_ingredientId: {
              merchantId,
              ingredientId: update.ingredientId,
            },
          },
          create: {
            merchantId,
            ingredientId: update.ingredientId,
            currentPricePerUnit: new Prisma.Decimal(update.pricePerUnit),
            currentPriceDate: new Date(),
          },
          update: {
            currentPricePerUnit: new Prisma.Decimal(update.pricePerUnit),
            currentPriceDate: new Date(),
          },
        })
      }

      // Trigger recipe cost recalculation
      await updateAllRecipeCosts(ctx, merchantId)

      return {
        updated: input.updates.length,
        customUpdated: customUpdates.length,
        globalUpdated: globalUpdates.length,
      }
    }),

  // Record purchase transaction
  recordPurchase: merchantProcedure
    .input(z.object({
      ingredientId: z.string(),
      isCustom: z.boolean().default(false),
      quantity: z.number().positive(),
      unit: z.nativeEnum(MeasurementUnit),
      unitCost: z.number().positive(),
      totalCost: z.number().positive(),
      store: z.string().optional(),
      receiptUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id

      // Create transaction record
      const transaction = await ctx.db.ingredientTransaction.create({
        data: {
          merchantId,
          ...(input.isCustom 
            ? { customIngredientId: input.ingredientId }
            : { merchantIngredientPricingId: await getMerchantPricingId(ctx, ctx.merchant.id, input.ingredientId) }
          ),
          type: 'PURCHASE',
          quantity: new Prisma.Decimal(input.quantity),
          unit: input.unit,
          unitCost: new Prisma.Decimal(input.unitCost),
          totalCost: new Prisma.Decimal(input.totalCost),
          store: input.store,
          receiptUrl: input.receiptUrl,
          notes: input.notes,
          previousStock: new Prisma.Decimal(0), // TODO: Calculate from current
          newStock: new Prisma.Decimal(input.quantity),
        },
      })

      // Update current stock
      if (input.isCustom) {
        await ctx.db.customIngredient.update({
          where: { id: input.ingredientId },
          data: {
            currentStock: {
              increment: input.quantity,
            },
          },
        })
      } else {
        // Update merchant pricing stock
        await ctx.db.merchantIngredientPrice.upsert({
          where: {
            merchantId_ingredientId: {
              merchantId,
              ingredientId: input.ingredientId,
            },
          },
          create: {
            merchantId,
            ingredientId: input.ingredientId,
            currentPricePerUnit: new Prisma.Decimal(input.unitCost),
            currentStock: new Prisma.Decimal(input.quantity),
            lastPurchasePrice: new Prisma.Decimal(input.unitCost),
            lastPurchaseDate: new Date(),
          },
          update: {
            currentStock: {
              increment: input.quantity,
            },
            lastPurchasePrice: new Prisma.Decimal(input.unitCost),
            lastPurchaseDate: new Date(),
          },
        })
      }

      return transaction
    }),

  getMerchantInventory: merchantProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      category: z.enum(IngredientCategory).optional(),
      lowStockOnly: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id
      const skip = (input.page - 1) * input.limit

      // Get ONLY global ingredients that merchant has added (has pricing for)
      const globalIngredientsPromise = ctx.db.merchantIngredientPrice.findMany({
        where: {
          merchantId,
          ...(input.search && {
            ingredient: {
              name: { contains: input.search, mode: 'insensitive' },
            },
          }),
          ...(input.category && {
            ingredient: { category: input.category },
          }),
          ...(input.lowStockOnly && {
            OR: [
              { 
                AND: [
                  { reorderPoint: { not: null } },
                  { currentStock: { lte: ctx.db.merchantIngredientPrice.fields.reorderPoint } }
                ]
              },
              { currentStock: { equals: 0 } }
            ]
          }),
        },
        skip,
        take: input.limit,
        include: {
          ingredient: true,
          priceHistory: {
            orderBy: { purchaseDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { ingredient: { name: 'asc' } },
      })

      // Get custom ingredients
      const customIngredientsPromise = ctx.db.customIngredient.findMany({
        where: {
          merchantId,
          isActive: true,
          ...(input.search && {
            name: { contains: input.search, mode: 'insensitive' },
          }),
          ...(input.category && { category: input.category }),
          ...(input.lowStockOnly && {
            OR: [
              {
                AND: [
                  { reorderPoint: { not: null } },
                  { currentStock: { lte: ctx.db.customIngredient.fields.reorderPoint } }
                ]
              },
              { currentStock: { equals: 0 } }
            ]
          }),
        },
        skip,
        take: input.limit,
        orderBy: { name: 'asc' },
      })

      const [merchantIngredients, customIngredients] = await Promise.all([
        globalIngredientsPromise,
        customIngredientsPromise,
      ])

      // Format response
      const formattedIngredients = [
        // Global ingredients that merchant has added
        ...merchantIngredients.map(mp => ({
          id: mp.ingredient.id,
          name: mp.ingredient.name,
          description: mp.ingredient.description,
          category: mp.ingredient.category,
          purchaseUnit: mp.ingredient.purchaseUnit,
          isGlobal: true,
          isCustom: false,
          pricePerUnit: Number(mp.currentPricePerUnit.toString()),
          currentStock: Number(mp.currentStock.toString()),
          preferredStore: mp.preferredStore,
          brandPreference: mp.brandPreference,
          reorderPoint: mp.reorderPoint ? Number(mp.reorderPoint.toString()) : null,
          reorderQuantity: mp.reorderQuantity ? Number(mp.reorderQuantity.toString()) : null,
          allergens: mp.ingredient.allergens,
          shelfLifeDays: mp.ingredient.shelfLifeDays,
          lastPurchaseDate: mp.lastPurchaseDate,
          isLowStock: mp.reorderPoint 
            ? Number(mp.currentStock.toString()) <= Number(mp.reorderPoint.toString())
            : Number(mp.currentStock.toString()) === 0,
        })),
        // Custom ingredients
        ...customIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          description: ing.description,
          category: ing.category,
          purchaseUnit: ing.purchaseUnit,
          isGlobal: false,
          isCustom: true,
          pricePerUnit: Number(ing.currentPricePerUnit.toString()),
          currentStock: Number(ing.currentStock.toString()),
          preferredStore: ing.preferredStore,
          reorderPoint: ing.reorderPoint ? Number(ing.reorderPoint.toString()) : null,
          allergens: ing.allergens || [],
          shelfLifeDays: ing.shelfLifeDays,
          isLowStock: ing.reorderPoint 
            ? Number(ing.currentStock.toString()) <= Number(ing.reorderPoint.toString())
            : Number(ing.currentStock.toString()) === 0,
        })),
      ]

      // Sort combined results
      formattedIngredients.sort((a, b) => a.name.localeCompare(b.name))

      // Calculate stats
      const totalIngredients = formattedIngredients.length
      const lowStockCount = formattedIngredients.filter(ing => ing.isLowStock).length
      const totalValue = formattedIngredients.reduce((sum, ing) => 
        sum + (ing.currentStock * ing.pricePerUnit), 0
      )

      return {
        ingredients: formattedIngredients,
        stats: {
          totalIngredients,
          lowStockCount,
          totalValue,
        },
        pagination: {
          page: input.page,
          limit: input.limit,
          total: totalIngredients,
          totalPages: Math.ceil(totalIngredients / input.limit),
        },
      }
    }),

  // Add ingredient from global library to merchant inventory
  addGlobalIngredient: merchantProcedure
    .input(z.object({
      ingredientId: z.string(),
      initialPricePerUnit: z.number().positive(),
      initialStock: z.number().min(0).default(0),
      preferredStore: z.string().optional(),
      brandPreference: z.string().optional(),
      reorderPoint: z.number().min(0).optional(),
      reorderQuantity: z.number().positive().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id

      // Verify ingredient exists
      const ingredient = await ctx.db.ingredient.findUnique({
        where: { id: input.ingredientId },
      })

      if (!ingredient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ingredient not found in library',
        })
      }

      // Check if already added
      const existing = await ctx.db.merchantIngredientPrice.findUnique({
        where: {
          merchantId_ingredientId: {
            merchantId,
            ingredientId: input.ingredientId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This ingredient is already in your inventory',
        })
      }

      // Create merchant pricing record
      const merchantPricing = await ctx.db.merchantIngredientPrice.create({
        data: {
          merchantId,
          ingredientId: input.ingredientId,
          currentPricePerUnit: new Prisma.Decimal(input.initialPricePerUnit),
          currentStock: new Prisma.Decimal(input.initialStock),
          currentPriceDate: new Date(),
          preferredStore: input.preferredStore,
          brandPreference: input.brandPreference,
          reorderPoint: input.reorderPoint 
            ? new Prisma.Decimal(input.reorderPoint) 
            : null,
          reorderQuantity: input.reorderQuantity 
            ? new Prisma.Decimal(input.reorderQuantity)
            : null,
          notes: input.notes,
        },
        include: {
          ingredient: true,
        },
      })

      return {
        id: merchantPricing.ingredient.id,
        name: merchantPricing.ingredient.name,
        pricePerUnit: Number(merchantPricing.currentPricePerUnit.toString()),
        currentStock: Number(merchantPricing.currentStock.toString()),
      }
    }),

  // Search global library (for adding new ingredients)
  searchGlobalLibrary: merchantProcedure
    .input(z.object({
      search: z.string().min(1),
      category: z.enum(IngredientCategory).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id

      // Get existing merchant ingredients to exclude
      const existingIngredients = await ctx.db.merchantIngredientPrice.findMany({
        where: { merchantId },
        select: { ingredientId: true },
      })

      const existingIds = existingIngredients.map(mp => mp.ingredientId)

      // Search global library excluding already added
      const ingredients = await ctx.db.ingredient.findMany({
        where: {
          isActive: true,
          id: { notIn: existingIds },
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { alternativeNames: { hasSome: [input.search] } },
            ],
          }),
          ...(input.category && { category: input.category }),
        },
        take: input.limit,
        orderBy: { name: 'asc' },
      })

      return ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        description: ing.description,
        category: ing.category,
        purchaseUnit: ing.purchaseUnit,
        referencePrice: Number(ing.referencePrice.toString()),
        allergens: ing.allergens,
        shelfLifeDays: ing.shelfLifeDays,
      }))
    }),
})