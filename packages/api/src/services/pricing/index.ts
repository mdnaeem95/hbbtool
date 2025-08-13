import { type Decimal } from '@kitchencloud/database'

export class PricingService {
  private static GST_RATE = 0.09 // Singapore GST 9%
  
  static calculateOrderTotals(
    items: Array<{ price: number; quantity: number }>,
    deliveryFee: number = 0,
    discount: number = 0
  ) {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    )
    
    const discountedSubtotal = Math.max(0, subtotal - discount)
    const tax = this.calculateGST(discountedSubtotal + deliveryFee)
    const total = discountedSubtotal + deliveryFee + tax
    
    return {
      subtotal: this.roundToTwoDp(subtotal),
      discount: this.roundToTwoDp(discount),
      tax: this.roundToTwoDp(tax),
      deliveryFee: this.roundToTwoDp(deliveryFee),
      total: this.roundToTwoDp(total),
    }
  }
  
  static calculateGST(amount: number): number {
    return amount * this.GST_RATE
  }
  
  static validateMinimumOrder(
    total: number,
    minimumOrder: number | Decimal
  ): boolean {
    const min = typeof minimumOrder === 'number' 
      ? minimumOrder 
      : minimumOrder.toNumber()
    return total >= min
  }
  
  private static roundToTwoDp(value: number): number {
    return Math.round(value * 100) / 100
  }
}
