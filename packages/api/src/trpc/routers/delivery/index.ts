import { z } from "zod"
import { router, merchantProcedure } from "../../core"
import { OrderStatus, DeliveryMethod } from "@homejiak/database"

export const deliveryRouter = router({
  getDeliveryOrders: merchantProcedure
    .input(z.object({
      date: z.date(),
      status: z.array(z.nativeEnum(OrderStatus)).optional()
    }))
    .query(async ({ ctx, input }) => {
      const startOfDay = new Date(input.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(input.date)
      endOfDay.setHours(23, 59, 59, 999)

      const orders = await ctx.db.order.findMany({
        where: {
          merchantId: ctx.merchant.id,
          deliveryMethod: DeliveryMethod.DELIVERY,
          scheduledFor: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: input.status ? { in: input.status } : undefined
        },
        include: {
          customer: true,
          deliveryAddress: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })

      return {
        orders: orders.map(order => ({
          id: order.id,
          orderId: order.orderNumber,
          customer: {
            name: order.customerName || order.customer?.name || "Guest",
            phone: order.customerPhone || order.customer?.phone || "",
            address: order.deliveryAddress?.line1 || "",
            postalCode: order.deliveryAddress?.postalCode || "",
            unitNumber: order.deliveryAddress?.line2 || "",
            deliveryNotes: order.deliveryNotes || ""
          },
          items: order.items.map(item => ({
            name: item.product.name,
            quantity: item.quantity
          })),
          status: order.status,
          total: Number(order.total),
          scheduledFor: order.scheduledFor
        }))
      }
    }),

  optimizeRoute: merchantProcedure
    .input(z.object({
      orderIds: z.array(z.string()),
      startLocation: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Group by postal district for efficient routing
      const orders = await ctx.db.order.findMany({
        where: { id: { in: input.orderIds } },
        include: { deliveryAddress: true }
      })

      const sortedByPostal = orders.sort((a, b) => {
        const postalA = a.deliveryAddress?.postalCode || ""
        const postalB = b.deliveryAddress?.postalCode || ""
        return postalA.localeCompare(postalB)
      })

      return {
        optimizedOrder: sortedByPostal.map((order, idx) => ({
          sequence: idx + 1,
          orderId: order.id,
          orderNumber: order.orderNumber,
          address: order.deliveryAddress?.line1 || "",
          postalCode: order.deliveryAddress?.postalCode || "",
          estimatedTime: 10 * (idx + 1) // 10 mins per stop
        })),
        totalDistance: sortedByPostal.length * 3, // Rough estimate
        estimatedDuration: sortedByPostal.length * 15, // 15 mins per delivery
        googleMapsUrl: generateGoogleMapsUrl(sortedByPostal)
      }
    }),

  exportToGoogleMaps: merchantProcedure
    .input(z.object({
      orderIds: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: { id: { in: input.orderIds } },
        include: { deliveryAddress: true }
      })

      const waypoints = orders.map(o => 
        `${o.deliveryAddress?.line1}, Singapore ${o.deliveryAddress?.postalCode}`
      ).join('/')

      const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`
      
      return { url: googleMapsUrl }
    }),

  markDelivered: merchantProcedure
    .input(z.object({
      orderId: z.string(),
      photo: z.string().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
          deliveryNotes: input.notes,
          metadata: {
            deliveryPhoto: input.photo
          }
        }
      })

      // Send notification to customer
      // await sendDeliveryNotification(updated)

      return updated
    })
})

function generateGoogleMapsUrl(orders: any[]) {
  const addresses = orders
    .map(o => `${o.deliveryAddress?.line1}, Singapore ${o.deliveryAddress?.postalCode}`)
    .join('/')
  return `https://www.google.com/maps/dir/${addresses}`
}