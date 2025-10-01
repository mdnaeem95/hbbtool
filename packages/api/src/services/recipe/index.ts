import { Prisma } from "@homejiak/database"
import type { TRPCContext } from "../../trpc/context"

/**
 * Recalculate recipe costs when a GLOBAL ingredient changes
 */
export async function updateRecipeCostsForIngredient(
  ctx: TRPCContext,
  ingredientId: string,
  merchantId: string
) {
  const usages = await ctx.db.recipeIngredient.findMany({
    where: {
      ingredientId,
      recipe: { merchantId },
    },
    include: {
      recipe: true,
      ingredient: {
        include: { merchantPricing: { where: { merchantId }, take: 1 } },
      },
    },
  })

  for (const usage of usages) {
    const ing = usage.ingredient
    if (!ing) continue

    // Prefer merchant-specific pricing, else fallback to reference price
    const unitPrice =
      ing.merchantPricing[0]?.currentPricePerUnit ?? ing.referencePrice

    const newCost = usage.quantity.mul(unitPrice)

    await ctx.db.recipe.update({
      where: { id: usage.recipeId },
      data: { totalCost: newCost },
    })
  }
}

/**
 * Recalculate recipe costs when a CUSTOM ingredient changes
 */
export async function updateRecipeCostsForCustomIngredient(
  ctx: TRPCContext,
  customIngredientId: string,
  merchantId: string
) {
  const usages = await ctx.db.recipeIngredient.findMany({
    where: {
      customIngredientId,
      recipe: { merchantId },
    },
    include: {
      recipe: true,
      customIngredient: true,
    },
  })

  for (const usage of usages) {
    const ing = usage.customIngredient
    if (!ing) continue

    const unitPrice = ing.currentPricePerUnit
    const newCost = usage.quantity.mul(unitPrice)

    await ctx.db.recipe.update({
      where: { id: usage.recipeId },
      data: { totalCost: newCost },
    })
  }
}

/**
 * Recalculate ALL recipe costs for a merchant
 */
export async function updateAllRecipeCosts(ctx: TRPCContext, merchantId: string) {
  const recipes = await ctx.db.recipe.findMany({
    where: { merchantId },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: { merchantPricing: { where: { merchantId }, take: 1 } },
          },
          customIngredient: true,
        },
      },
    },
  })

  for (const recipe of recipes) {
    let totalCost = new Prisma.Decimal(0)

    for (const usage of recipe.ingredients) {
      if (usage.ingredient) {
        const ing = usage.ingredient
        const unitPrice =
          ing.merchantPricing[0]?.currentPricePerUnit ?? ing.referencePrice
        totalCost = totalCost.plus(usage.quantity.mul(unitPrice))
      } else if (usage.customIngredient) {
        const ing = usage.customIngredient
        totalCost = totalCost.plus(usage.quantity.mul(ing.currentPricePerUnit))
      }
    }

    await ctx.db.recipe.update({
      where: { id: recipe.id },
      data: { totalCost },
    })
  }
}
