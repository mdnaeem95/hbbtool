import { db } from '@homejiak/database'
import { TRPCError } from '@trpc/server'

type ReserveItem = {
  productId: string
  quantity: number
  /** If provided, reserve against variant inventory instead of product inventory */
  variantId?: string
}

export class InventoryService {
  /** Quick boolean check for availability (product or variant). */
  static async checkAvailability(
    productId: string,
    requestedQuantity: number,
    variantId?: string
  ): Promise<boolean> {
    // If a variant is specified, check variant inventory first.
    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        select: { inventory: true, product: { select: { status: true } } },
      })
      if (!variant || variant.product.status !== 'ACTIVE') return false
      return variant.inventory >= requestedQuantity
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { trackInventory: true, inventory: true, status: true },
    })

    if (!product || product.status !== 'ACTIVE') return false
    if (!product.trackInventory) return true
    return product.inventory >= requestedQuantity
  }

  /** Bulk boolean checks. Variant-aware if items include variantId. */
  static async checkBulkAvailability(
    items: ReserveItem[]
  ): Promise<Map<string, boolean>> {
    const productIds = Array.from(new Set(items.map(i => i.productId)))
    const variantIds = Array.from(new Set(items.map(i => i.variantId).filter(Boolean) as string[]))

    const [products, variants] = await Promise.all([
      db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, trackInventory: true, inventory: true, status: true },
      }),
      variantIds.length
        ? db.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, inventory: true, product: { select: { status: true } } },
          })
        : Promise.resolve([]),
    ])

    const productMap = new Map(products.map(p => [p.id, p]))
    const variantMap = new Map(variants.map(v => [v.id, v]))

    const result = new Map<string, boolean>()
    for (const item of items) {
      if (item.variantId) {
        const v = variantMap.get(item.variantId)
        const ok = !!v && v.product.status === 'ACTIVE' && v.inventory >= item.quantity
        result.set(item.variantId, ok)
      } else {
        const p = productMap.get(item.productId)
        const ok =
          !!p &&
          p.status === 'ACTIVE' &&
          (!p.trackInventory || p.inventory >= item.quantity)
        result.set(item.productId, ok)
      }
    }
    return result
  }

  /**
   * Reserve (decrement) stock atomically.
   * If variantId is provided, decrements variant inventory; otherwise product inventory.
   * Honors `allowBackorder` for products when no variant is provided.
   * Creates InventoryLog entries.
   */
  static async reserveStock(items: ReserveItem[], actorId?: string) {
    return db.$transaction(async (tx) => {
      for (const item of items) {
        if (item.variantId) {
          // Variant-level reservation
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { id: true, inventory: true, productId: true, product: { select: { status: true } } },
          })
          if (!variant || variant.product.status !== 'ACTIVE') {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Variant ${item.variantId} not found or inactive` })
          }
          if (variant.inventory < item.quantity) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Insufficient variant stock for ${item.variantId}` })
          }

          const previous = variant.inventory
          const updated = await tx.productVariant.update({
            where: { id: item.variantId },
            data: { inventory: { decrement: item.quantity } },
            select: { inventory: true, productId: true },
          })

          await tx.inventoryLog.create({
            data: {
              productId: variant.productId,
              type: 'SALE',
              quantity: -item.quantity,
              reason: 'Order reservation (variant)',
              reference: undefined,
              previousStock: previous,
              newStock: updated.inventory,
              createdBy: actorId ?? 'system',
            },
          })

          // (Optional) If you also want to reflect on product.inventory totals, do it here.
          continue
        }

        // Product-level reservation
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            status: true,
            trackInventory: true,
            allowBackorder: true,
            inventory: true,
            lowStockThreshold: true,
            merchantId: true,
            name: true,
          },
        })

        if (!product || product.status !== 'ACTIVE') {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Product ${item.productId} not found or inactive` })
        }

        if (!product.trackInventory) {
          // No tracking → nothing to decrement
          continue
        }

        // Enforce stock unless backorders are allowed
        if (!product.allowBackorder && product.inventory < item.quantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient stock for product ${item.productId}`,
          })
        }

        const previous = product.inventory
        const newStock = product.inventory - item.quantity
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { inventory: newStock },
          select: { inventory: true, merchantId: true, lowStockThreshold: true, name: true, id: true },
        })

        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            type: 'SALE',
            quantity: -item.quantity,
            reason: 'Order reservation',
            reference: undefined,
            previousStock: previous,
            newStock: updated.inventory,
            createdBy: actorId ?? 'system',
          },
        })

        // Low stock alert
        if (
          typeof updated.lowStockThreshold === 'number' &&
          previous >= updated.lowStockThreshold &&
          updated.inventory < updated.lowStockThreshold
        ) {
          await tx.notification.create({
            data: {
              merchantId: updated.merchantId,
              type: 'LOW_STOCK_ALERT',
              title: 'Low Stock Alert',
              message: `${product.name} is running low (${updated.inventory} left)`,
              data: { productId: product.id, currentQuantity: updated.inventory },
              priority: 'HIGH',
            },
          })
        }
      }
    })
  }

  /** Release (increment) stock — e.g., when an order is cancelled. */
  static async releaseStock(items: ReserveItem[], actorId?: string) {
    return db.$transaction(async (tx) => {
      for (const item of items) {
        if (item.variantId) {
          const variant = await tx.productVariant.update({
            where: { id: item.variantId },
            data: { inventory: { increment: item.quantity } },
            select: { inventory: true, productId: true },
          })
          await tx.inventoryLog.create({
            data: {
              productId: variant.productId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: 'Reservation release (variant)',
              previousStock: variant.inventory - item.quantity,
              newStock: variant.inventory,
              createdBy: actorId ?? 'system',
            },
          })
          continue
        }

        const existing = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, inventory: true },
        })
        if (!existing) continue

        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { inventory: { increment: item.quantity } },
          select: { inventory: true },
        })

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            type: 'RETURN',
            quantity: item.quantity,
            reason: 'Reservation release',
            previousStock: existing.inventory,
            newStock: updated.inventory,
            createdBy: actorId ?? 'system',
          },
        })
      }
    })
  }

  /** Direct adjustment helpers (admin/merchant tools) */
  static async setStock(productId: string, newQuantity: number, actorId?: string) {
    const current = await db.product.findUnique({ where: { id: productId }, select: { inventory: true } })
    if (!current) throw new TRPCError({ code: 'NOT_FOUND' })

    const updated = await db.product.update({
      where: { id: productId },
      data: { inventory: newQuantity },
      select: { inventory: true },
    })

    await db.inventoryLog.create({
      data: {
        productId,
        type: 'ADJUSTMENT',
        quantity: newQuantity - current.inventory,
        reason: 'Manual set',
        previousStock: current.inventory,
        newStock: updated.inventory,
        createdBy: actorId ?? 'system',
      },
    })

    return updated
  }

  static async adjustStock(
    productId: string,
    delta: number,
    reason: string = 'Manual adjustment',
    actorId?: string
  ) {
    const current = await db.product.findUnique({ where: { id: productId }, select: { inventory: true } })
    if (!current) throw new TRPCError({ code: 'NOT_FOUND' })

    const updated = await db.product.update({
      where: { id: productId },
      data: { inventory: { increment: delta } },
      select: { inventory: true },
    })

    await db.inventoryLog.create({
      data: {
        productId,
        type: delta >= 0 ? 'RESTOCK' : 'DAMAGE',
        quantity: delta,
        reason,
        previousStock: current.inventory,
        newStock: updated.inventory,
        createdBy: actorId ?? 'system',
      },
    })

    return updated
  }
}