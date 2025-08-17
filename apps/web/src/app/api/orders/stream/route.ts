import { NextRequest } from "next/server"
import { getMerchantSession } from "@/app/actions/merchant-auth"
import { db } from "@kitchencloud/database"

// Helper to format SSE message
function formatSSE(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  // Verify merchant session
  const session = await getMerchantSession()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const merchantId = session.merchant.id

  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Send initial connection message
  writer.write(encoder.encode(formatSSE({ 
    type: "connected", 
    merchantId,
    timestamp: new Date().toISOString() 
  })))

  // Keep track of active connection
  let isActive = true

  // Polling interval (in production, consider using database triggers or Redis pub/sub)
  const POLL_INTERVAL = 5000 // 5 seconds
  let lastCheckTime = new Date()

  const pollForUpdates = async () => {
    if (!isActive) return

    try {
      // Check for new orders
      const newOrders = await db.order.findMany({
        where: {
          merchantId,
          createdAt: { gt: lastCheckTime }
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' }
      })

      // Check for updated orders
      const updatedOrders = await db.order.findMany({
        where: {
          merchantId,
          updatedAt: { gt: lastCheckTime },
          createdAt: { lte: lastCheckTime } // Not new orders
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          payment: true,
        }
      })

      // Send new orders
      for (const order of newOrders) {
        await writer.write(encoder.encode(formatSSE({
          type: "new_order",
          order,
          timestamp: new Date().toISOString()
        })))
      }

      // Send order updates
      for (const order of updatedOrders) {
        await writer.write(encoder.encode(formatSSE({
          type: "order_updated",
          order,
          timestamp: new Date().toISOString()
        })))
      }

      // Check for status changes in the last interval
      const orderEvents = await db.orderEvent.findMany({
        where: {
          order: { merchantId },
          createdAt: { gt: lastCheckTime },
          event: { startsWith: "STATUS_CHANGED" }
        },
        include: {
          order: {
            include: {
              items: {
                include: {
                  product: true
                }
              },
              payment: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Send status change events
      for (const event of orderEvents) {
        await writer.write(encoder.encode(formatSSE({
          type: "status_changed",
          order: event.order,
          event: event.event,
          data: event.data,
          timestamp: event.createdAt.toISOString()
        })))
      }

      // Send heartbeat to keep connection alive
      await writer.write(encoder.encode(formatSSE({
        type: "heartbeat",
        timestamp: new Date().toISOString()
      })))

      lastCheckTime = new Date()

      // Schedule next poll
      if (isActive) {
        setTimeout(pollForUpdates, POLL_INTERVAL)
      }
    } catch (error) {
      console.error("Error polling for updates:", error)
      // Try again after a delay
      if (isActive) {
        setTimeout(pollForUpdates, POLL_INTERVAL * 2)
      }
    }
  }

  // Start polling
  pollForUpdates()

  // Handle client disconnect
  request.signal.addEventListener("abort", () => {
    isActive = false
    writer.close()
  })

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}