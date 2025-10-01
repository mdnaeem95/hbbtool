import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { Prisma  } from "@homejiak/database"
import { router, merchantProcedure } from "../../core"

export enum RecipeCategory {
  BAKED_GOODS = "BAKED_GOODS",
  PASTRIES = "PASTRIES",
  CAKES = "CAKES",
  COOKIES = "COOKIES",
  BREADS = "BREADS",
  DESSERTS = "DESSERTS",
  MAINS = "MAINS",
  APPETIZERS = "APPETIZERS",
  SIDES = "SIDES",
  BEVERAGES = "BEVERAGES",
  SAUCES_CONDIMENTS = "SAUCES_CONDIMENTS",
  MEAL_PREP = "MEAL_PREP",
  CATERING = "CATERING",
  SNACKS = "SNACKS",
  OTHER = "OTHER",
}

export enum MeasurementUnit {
  // Weight
  GRAMS = "GRAMS",
  KG = "KG",
  OUNCES = "OUNCES",
  POUNDS = "POUNDS",

  // Volume
  ML = "ML",
  LITERS = "LITERS",
  TSP = "TSP",
  TBSP = "TBSP",
  CUPS = "CUPS",

  // Count
  PIECES = "PIECES",
  SERVINGS = "SERVINGS",
  BATCHES = "BATCHES",
  DOZEN = "DOZEN",
}

// Validation schemas based on actual schema
const createRecipeSchema = z.object({
  productId: z.string().optional(), // Optional since Recipe can exist without products
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(RecipeCategory).default("BAKED_GOODS" as RecipeCategory),
  baseYield: z.number().positive(),
  yieldUnit: z.enum(MeasurementUnit),
  prepTime: z.number().int().positive(),
  cookTime: z.number().int().positive(),
  coolingTime: z.number().int().default(0),
  decorationTime: z.number().int().default(0),
  shelfLifeDays: z.number().int().positive().optional(),
  storageInstructions: z.string().optional(),
  notes: z.string().optional(),
  ingredients: z.array(z.object({
    ingredientId: z.string().optional(),
    customIngredientId: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.nativeEnum(MeasurementUnit),
    prepNotes: z.string().optional(),
    isOptional: z.boolean().default(false),
  })).min(1),
})

export const recipeRouter = router({
  // Get all recipes for a merchant
  getAll: merchantProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      category: z.nativeEnum(RecipeCategory).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id
      const skip = (input.page - 1) * input.limit

      const where: Prisma.RecipeWhereInput = {
        merchantId,
        deletedAt: null,
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ],
        }),
        ...(input.category && { category: input.category }),
      }

      const [recipes, total] = await Promise.all([
        ctx.db.recipe.findMany({
          where,
          skip,
          take: input.limit,
          include: {
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
            ingredients: {
              include: {
                ingredient: true,
                customIngredient: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        ctx.db.recipe.count({ where }),
      ])

      return {
        recipes,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      }
    }),

  // Get single recipe with full details
  getById: merchantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findFirst({
        where: {
          id: input.id,
          merchantId: ctx.merchant.id,
          deletedAt: null,
        },
        include: {
          products: true,
          ingredients: {
            include: {
              ingredient: true,
              customIngredient: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!recipe) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        })
      }

      // Calculate costs if not cached or outdated
      let totalCost = recipe.totalCost ? Number(recipe.totalCost.toString()) : 0
      let costPerUnit = recipe.costPerUnit ? Number(recipe.costPerUnit.toString()) : 0

      if (!recipe.lastCostCalculated || 
          recipe.lastCostCalculated < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        // Recalculate if no cost or older than 7 days
        const ingredientCost = recipe.ingredients.reduce((sum, ri) => {
          if (ri.ingredient) {
            const costPerUnit = Number(ri.ingredient.referencePrice.toString())
            const quantity = Number(ri.quantity.toString())
            return sum + (costPerUnit * quantity)
          }
          if (ri.customIngredient) {
            const costPerUnit = Number(ri.customIngredient.currentPricePerUnit.toString())
            const quantity = Number(ri.quantity.toString())
            return sum + (costPerUnit * quantity)
          }
          return sum
        }, 0)

        const laborCost = Number(recipe.laborCostPerHour.toString()) * 
                         ((recipe.prepTime + recipe.cookTime) / 60)
        const overheadCost = ingredientCost * Number(recipe.overheadRate.toString())
        const packagingCost = Number(recipe.packagingCost?.toString() || 0)
        
        totalCost = ingredientCost + laborCost + overheadCost + packagingCost
        costPerUnit = totalCost / Number(recipe.baseYield.toString())

        // Update cached costs
        await ctx.db.recipe.update({
          where: { id: recipe.id },
          data: {
            ingredientCost: new Prisma.Decimal(ingredientCost),
            laborCost: new Prisma.Decimal(laborCost),
            overheadCost: new Prisma.Decimal(overheadCost),
            totalCost: new Prisma.Decimal(totalCost),
            costPerUnit: new Prisma.Decimal(costPerUnit),
            lastCostCalculated: new Date(),
            costConfidence: 'MEDIUM',
          },
        })
      }

      return {
        ...recipe,
        calculatedCost: {
          total: totalCost,
          perUnit: costPerUnit,
          ingredientBreakdown: recipe.ingredients.map(ri => {
            const ingredient = ri.ingredient || ri.customIngredient
            if (!ingredient) return null

            const unitCost = Number(
              ri.ingredient 
                ? ri.ingredient.referencePrice.toString()
                : ri.customIngredient!.currentPricePerUnit.toString()
            )
            const quantity = Number(ri.quantity.toString())
            const totalCost = unitCost * quantity

            return {
              ingredientName: ri.ingredient?.name || ri.customIngredient?.name || 'Unknown',
              quantity,
              unit: ri.unit,
              unitCost,
              totalCost,
            }
          }).filter(Boolean),
        },
      }
    }),

  // Create new recipe
  create: merchantProcedure
    .input(createRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.merchant.id
      const { ingredients, productId, ...recipeData } = input

      // Verify product belongs to merchant if provided
      if (productId) {
        const product = await ctx.db.product.findFirst({
          where: {
            id: productId,
            merchantId,
          },
        })

        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          })
        }
      }

      // Calculate total time
      const totalTime = recipeData.prepTime + 
                       recipeData.cookTime + 
                       recipeData.coolingTime + 
                       recipeData.decorationTime

      // Create recipe with ingredients
      const recipe = await ctx.db.recipe.create({
        data: {
          ...recipeData,
          merchantId,
          baseYield: new Prisma.Decimal(recipeData.baseYield),
          totalTime,
          ingredients: {
            create: ingredients.map((ingredient, index) => ({
              ingredientId: ingredient.ingredientId,
              customIngredientId: ingredient.customIngredientId,
              quantity: new Prisma.Decimal(ingredient.quantity),
              unit: ingredient.unit,
              prepNotes: ingredient.prepNotes,
              isOptional: ingredient.isOptional,
              sortOrder: index,
            })),
          },
          ...(productId && {
            products: {
              connect: { id: productId },
            },
          }),
        },
        include: {
          products: true,
          ingredients: {
            include: {
              ingredient: true,
              customIngredient: true,
            },
          },
        },
      })

      // Calculate initial costs
      const ingredientCost = recipe.ingredients.reduce((sum, ri) => {
        if (ri.ingredient) {
          const costPerUnit = Number(ri.ingredient.referencePrice.toString())
          const quantity = Number(ri.quantity.toString())
          return sum + (costPerUnit * quantity)
        }
        if (ri.customIngredient) {
          const costPerUnit = Number(ri.customIngredient.currentPricePerUnit.toString())
          const quantity = Number(ri.quantity.toString())
          return sum + (costPerUnit * quantity)
        }
        return sum
      }, 0)

      const baseYield = Number(recipe.baseYield.toString())
      const costPerUnit = ingredientCost / baseYield

      // Update recipe with calculated costs
      await ctx.db.recipe.update({
        where: { id: recipe.id },
        data: {
          ingredientCost: new Prisma.Decimal(ingredientCost),
          totalCost: new Prisma.Decimal(ingredientCost),
          costPerUnit: new Prisma.Decimal(costPerUnit),
          lastCostCalculated: new Date(),
          costConfidence: 'HIGH',
        },
      })

      // Update product cost if linked
      if (productId) {
        await ctx.db.product.update({
          where: { id: productId },
          data: { 
            recipeCost: new Prisma.Decimal(costPerUnit),
          },
        })
      }

      return recipe
    }),

  // Link recipe to product
  linkToProduct: merchantProcedure
    .input(z.object({
      recipeId: z.string(),
      productId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify both belong to merchant
      const [recipe, product] = await Promise.all([
        ctx.db.recipe.findFirst({
          where: {
            id: input.recipeId,
            merchantId: ctx.merchant.id,
          },
        }),
        ctx.db.product.findFirst({
          where: {
            id: input.productId,
            merchantId: ctx.merchant.id,
          },
        }),
      ])

      if (!recipe || !product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe or product not found',
        })
      }

      // Update product with recipe
      await ctx.db.product.update({
        where: { id: input.productId },
        data: {
          recipeId: input.recipeId,
          recipeCost: recipe.costPerUnit,
        },
      })

      return { success: true }
    }),

  // Calculate pricing suggestions
  calculatePricing: merchantProcedure
    .input(z.object({
      recipeId: z.string(),
      markupPercentage: z.number().min(0).default(300),
    }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findFirst({
        where: {
          id: input.recipeId,
          merchantId: ctx.merchant.id,
        },
        include: {
          products: true,
          ingredients: {
            include: {
              ingredient: true,
              customIngredient: true,
            },
          },
        },
      })

      if (!recipe) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        })
      }

      const totalCost = recipe.totalCost ? Number(recipe.totalCost.toString()) : 0
      const costPerUnit = recipe.costPerUnit ? Number(recipe.costPerUnit.toString()) : 0
      
      // Calculate suggested price
      const suggestedPrice = costPerUnit * (1 + input.markupPercentage / 100)

      // Get current product prices if linked
      const productPrices = recipe.products.map(p => ({
        name: p.name,
        currentPrice: Number(p.price.toString()),
        profit: Number(p.price.toString()) - costPerUnit,
        margin: ((Number(p.price.toString()) - costPerUnit) / Number(p.price.toString())) * 100,
      }))

      return {
        recipe: {
          name: recipe.name,
          baseYield: Number(recipe.baseYield.toString()),
          yieldUnit: recipe.yieldUnit,
        },
        costs: {
          total: totalCost,
          perUnit: costPerUnit,
          confidence: recipe.costConfidence || 'UNKNOWN',
        },
        pricing: {
          suggested: {
            price: suggestedPrice,
            profit: suggestedPrice - costPerUnit,
            margin: ((suggestedPrice - costPerUnit) / suggestedPrice) * 100,
            markup: input.markupPercentage,
          },
          products: productPrices,
        },
      }
    }),
})