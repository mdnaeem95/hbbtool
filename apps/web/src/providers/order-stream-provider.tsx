"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useSession } from "@/hooks/use-session"
import { api } from "@/lib/trpc/client"
import { useToast } from "@kitchencloud/ui"
import { useOrderStore } from "@/stores/order-store"

interface OrderStreamContextValue {
  isConnected: boolean
  lastUpdate: Date | null
}

const OrderStreamContext = createContext<OrderStreamContextValue>({
  isConnected: false,
  lastUpdate: null,
})

export function useOrderStream() {
  return useContext(OrderStreamContext)
}

interface OrderStreamProviderProps {
  children: React.ReactNode
}

export function OrderStreamProvider({ children }: OrderStreamProviderProps) {
  const { user, isAuthenticated, loading } = useSession()
  const { toast } = useToast()
  const utils = api.useUtils()
  const { setLastUpdate } = useOrderStore()
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdateState] = useState<Date | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  
  useEffect(() => {
    // Only connect if authenticated merchant
    if (loading || !isAuthenticated || !user?.id || user?.user_metadata?.userType !== 'merchant') {
      return
    }
    
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    function connect() {
      if (eventSourceRef.current?.readyState === EventSource.OPEN) {
        return // Already connected
      }
      
      try {
        const eventSource = new EventSource("/api/orders/stream", {
          withCredentials: true,
        })
        
        eventSource.onopen = () => {
          setIsConnected(true)
          reconnectAttemptsRef.current = 0
          console.log("Order stream connected")
        }
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === "heartbeat") {
              // Keep connection alive
              return
            }
            
            if (data.type === "order_update") {
              const updateTime = new Date()
              setLastUpdate(updateTime)
              setLastUpdateState(updateTime)
              
              // Invalidate order queries to refresh data
              utils.order.list.invalidate()
              
              // Show notification for new orders
              if (data.status === "PENDING") {
                toast({
                  title: "New Order!",
                  description: `Order #${data.orderNumber} received`,
                })
              }
            }
          } catch (error) {
            console.error("Failed to parse SSE message:", error)
          }
        }
        
        eventSource.onerror = () => {
          setIsConnected(false)
          eventSource.close()
          eventSourceRef.current = null
          
          // Exponential backoff for reconnection
          const attempts = reconnectAttemptsRef.current
          if (attempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
            reconnectAttemptsRef.current++
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Reconnecting... (attempt ${attempts + 1})`)
              connect()
            }, delay)
          } else {
            console.error("Max reconnection attempts reached")
            // Fallback to polling every 30 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current = 0
              connect()
            }, 30000)
          }
        }
        
        eventSourceRef.current = eventSource
      } catch (error) {
        console.error("Failed to create EventSource:", error)
        setIsConnected(false)
      }
    }
    
    // Initial connection
    connect()
    
    // Cleanup on unmount or session change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      setIsConnected(false)
    }
  }, [user?.id, isAuthenticated, loading, toast, utils, setLastUpdate])
  
  // Fallback polling mechanism for robustness
  useEffect(() => {
    if (loading || !isAuthenticated || !user?.id || user?.user_metadata?.userType !== 'merchant') {
      return
    }
    
    // Poll every 30 seconds as a backup
    const interval = setInterval(() => {
      if (!isConnected) {
        utils.order.list.invalidate()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isConnected, user?.id, isAuthenticated, loading, utils])
  
  return (
    <OrderStreamContext.Provider value={{ isConnected, lastUpdate }}>
      {children}
    </OrderStreamContext.Provider>
  )
}