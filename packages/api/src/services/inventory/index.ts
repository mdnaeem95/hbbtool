import { db } from '@kitchencloud/database'
import { TRPCError } from '@trpc/server'

export class InventoryService {
  static async checkAvailability(
    productId: string,
    requestedQuantity: number
  ): Promise<boolean> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { trackQuantity: true, quantity: true, status: true },
    })
    
    if (!product || product.status !== 'ACTIVE') {
      return false
    }
    
    if (!product.trackQuantity) {
      return true
    }
    
    return product.quantity >= requestedQuantity
  }
  
  static async checkBulkAvailability(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<Map<string, boolean>> {
    const productIds = items.map(item => item.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { 
        id: true, 
        trackQuantity: true, 
        quantity: true,
        status: true,
      },
    })
    
    const availability = new Map<string, boolean>()
    
    items.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product || product.status !== 'ACTIVE') {
        availability.set(item.productId, false)
      } else if (!product.trackQuantity) {
        availability.set(item.productId, true)
      } else {
        availability.set(item.productId, product.quantity >= item.quantity)
      }
    })
    
    return availability
  }
  
  static async updateStock(
    productId: string,
    change: number,
    operation: 'increment' | 'decrement' | 'set' = 'increment'
  ) {
    if (operation === 'set') {
      return db.product.update({
        where: { id: productId },
        data: { quantity: change },
      })
    }
    
    const delta = operation === 'increment' ? change : -change
    
    const updated = await db.product.update({
      where: { id: productId },
      data: { quantity: { increment: delta } },
    })
    
    // Check for low stock alert
    if (updated.trackQuantity && updated.quantity <= updated.lowStockAlert) {
      await this.createLowStockNotification(productId, updated.quantity)
    }
    
    return updated
  }
  
  static async reserveStock(
    items: Array<{ productId: string; quantity: number }>
  ) {
    // Use transaction to ensure atomicity
    return db.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { trackQuantity: true, quantity: true },
        })
        
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Product ${item.productId} not found`,
          })
        }
        
        if (product.trackQuantity) {
          if (product.quantity < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient stock for product ${item.productId}`,
            })
          }
          
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          })
        }
      }
    })
  }
  
  private static async createLowStockNotification(
    productId: string,
    currentQuantity: number
  ) {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true, merchantId: true },
    })
    
    if (!product) return
    
    await db.notification.create({
      data: {
        merchantId: product.merchantId,
        type: 'ORDER_PLACED', // We should add LOW_STOCK to enum
        title: 'Low Stock Alert',
        message: `${product.name} is running low (${currentQuantity} left)`,
        data: { productId, currentQuantity },
      },
    })
  }
}