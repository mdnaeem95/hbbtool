import { Prisma } from "@homejiak/database"
import { TRPCContext } from "../../trpc/context"

export async function getMerchantPricingId(
  ctx: TRPCContext,
  merchantId: string,
  ingredientId: string
) {
  const pricing = await ctx.db.merchantIngredientPrice.upsert({
    where: { merchantId_ingredientId: { merchantId, ingredientId } },
    create: {
      merchantId,
      ingredientId,
      currentPricePerUnit: new Prisma.Decimal(0),
      currentPriceDate: new Date(),
    },
    update: {}, // nothing if exists
  })
  return pricing.id
}
