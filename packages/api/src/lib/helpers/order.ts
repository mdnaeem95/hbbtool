import { OrderStatus } from '@kitchencloud/database'

// Allowed transitions
type Flow = Record<OrderStatus, readonly OrderStatus[]>

const pickupFlow = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY,     OrderStatus.CANCELLED],
  [OrderStatus.READY]:     [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]:  [],
  [OrderStatus.OUT_FOR_DELIVERY]: [],
  [OrderStatus.DELIVERED]: [],
} as const satisfies Flow

const deliveryFlow = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED,       OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING,       OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY,           OrderStatus.CANCELLED],
  [OrderStatus.READY]:     [OrderStatus.OUT_FOR_DELIVERY,OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED,       OrderStatus.REFUNDED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]:  [],
} as const satisfies Flow

export function canUpdateOrderStatus(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  isPickup: boolean
): boolean {
  const flow: Flow = isPickup ? pickupFlow : deliveryFlow
  return flow[currentStatus].includes(newStatus)
}