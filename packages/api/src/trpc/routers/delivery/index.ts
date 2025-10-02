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
          scheduledFor: order.scheduledFor,
          deliveryPartner: order.deliveryPartner
        })),
        unassigned: []
      }
    }),

  optimizeRoutes: merchantProcedure
    .input(z.object({
      orders: z.array(z.object({
        id: z.string(),
        customer: z.object({
          address: z.string(),
          postalCode: z.string()
        })
      })),
      mode: z.enum(["time", "distance", "fuel"]),
      constraints: z.object({
        maxStopsPerRoute: z.number(),
        maxDurationPerRoute: z.number(),
        startLocation: z.object({
          lat: z.number(),
          lng: z.number()
        }).optional(),
        endLocation: z.object({
          lat: z.number(),
          lng: z.number()
        }).optional()
      })
    }))
    .mutation(async ({ input }) => {
      const groupedByDistrict = input.orders.reduce((acc, order) => {
        const district = order.customer.postalCode.substring(0, 2)
        if (!acc[district]) acc[district] = []
        acc[district].push(order)
        return acc
      }, {} as Record<string, typeof input.orders>)

      const routes = Object.entries(groupedByDistrict).map(([district, orders], idx) => {
        const routeOrders = orders.slice(0, input.constraints.maxStopsPerRoute)
        
        return {
          id: `route-${idx + 1}`,
          district,
          stops: routeOrders.map((order, stopIdx) => ({
            id: order.id,
            orderId: order.id,
            coordinates: {
              // Singapore postal code to approximate coordinates
              lat: 1.3521 + (parseInt(district) * 0.001),
              lng: 103.8198 + (parseInt(district) * 0.001)
            },
            customer: order.customer,
            estimatedArrival: new Date(Date.now() + (stopIdx + 1) * 30 * 60000),
            priority: "normal" as const
          })),
          driver: null,
          estimatedDuration: routeOrders.length * 30,
          totalDistance: routeOrders.length * 5,
          estimatedDeliveryCost: routeOrders.length * 3.5,
          hasTimeConstraints: false,
          timeConstraintCount: 0
        }
      })
      
      return { routes }
    }),

  updateDeliveryStatus: merchantProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(["enroute", "arrived", "delivered", "failed"]),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
      notes: z.string().optional(),
      photo: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const statusMap = {
        enroute: OrderStatus.OUT_FOR_DELIVERY,
        arrived: OrderStatus.OUT_FOR_DELIVERY,
        delivered: OrderStatus.DELIVERED,
        failed: OrderStatus.CANCELLED
      }

      const updated = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: statusMap[input.status],
          deliveryNotes: input.notes,
          deliveredAt: input.status === "delivered" ? new Date() : undefined,
          metadata: {
            deliveryLocation: input.location,
            deliveryPhoto: input.photo
          }
        }
      })

      return updated
    })
})