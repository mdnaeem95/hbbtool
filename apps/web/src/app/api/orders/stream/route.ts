import { NextRequest } from "next/server"
import { db } from "@homejiak/database"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper to format SSE message
function formatSSE(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  // Use the new non-deprecated pattern
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Get the user session
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Get merchant from database using user ID
  const merchant = await db.merchant.findUnique({
    where: { id: user.id }
  })

  if (!merchant || merchant.status !== 'ACTIVE') {
    return new Response("Unauthorized - Not an active merchant", { status: 401 })
  }

  const merchantId = merchant.id

  // Rest of your SSE implementation
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(formatSSE({ 
        type: "connected", 
        merchantId,
        timestamp: new Date().toISOString() 
      })))

      let isActive = true
      const POLL_INTERVAL = 5000
      let lastCheckTime = new Date()

      const pollForUpdates = async () => {
        if (!isActive) return

        try {
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

          for (const order of newOrders) {
            controller.enqueue(encoder.encode(formatSSE({
              type: "new_order",
              order,
              timestamp: new Date().toISOString()
            })))
          }

          const updatedOrders = await db.order.findMany({
            where: {
              merchantId,
              updatedAt: { gt: lastCheckTime },
              createdAt: { lte: lastCheckTime }
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

          for (const order of updatedOrders) {
            controller.enqueue(encoder.encode(formatSSE({
              type: "order_updated",
              order,
              timestamp: new Date().toISOString()
            })))
          }

          controller.enqueue(encoder.encode(formatSSE({
            type: "heartbeat",
            timestamp: new Date().toISOString()
          })))

          lastCheckTime = new Date()

          if (isActive) {
            setTimeout(pollForUpdates, POLL_INTERVAL)
          }
        } catch (error) {
          console.error("Polling error:", error)
          if (isActive) {
            setTimeout(pollForUpdates, POLL_INTERVAL * 2)
          }
        }
      }

      pollForUpdates()

      request.signal.addEventListener("abort", () => {
        isActive = false
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}