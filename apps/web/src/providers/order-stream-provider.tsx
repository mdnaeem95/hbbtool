"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useAuth } from "@homejiak/auth/client"
import { api } from "../lib/trpc/client"
import { useToast } from "@homejiak/ui"
import { useOrderStore } from "../stores/order-store"

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
  const { user, isAuthenticated, isLoading, isMerchant } = useAuth()
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
    if (isLoading || !isAuthenticated || !user?.id || !isMerchant) {
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
          console.log("✅ Order stream connected")
        }
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === "heartbeat") {
              // Keep connection alive
              return
            }
            
            if (data.type === "connected") {
              console.log("📡 Connected to order stream")
              return
            }
            
            // 🔥 FIX: Handle the correct message types from your SSE endpoint
            if (data.type === "new_order") {
              const updateTime = new Date()
              setLastUpdate(updateTime)
              setLastUpdateState(updateTime)
              
              // Invalidate order queries to refresh data
              utils.order.list.invalidate()
              utils.merchant.getDashboard.invalidate(),
              utils.notification.getUnreadCount.invalidate(),
              utils.notification.getNotifications.invalidate()
              
              // Show notification for new orders
              toast({
                title: "New Order! 🎉",
                description: `Order #${data.order.orderNumber} received - $${data.order.total}`,
                duration: 5000,
              })
              
              // Optional: Browser notification if page is not visible
              if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New Order - HomeJiak', {
                  body: `Order #${data.order.orderNumber} received`,
                  icon: '/favicon.ico',
                })
              }
            }
            
            if (data.type === "order_updated") {
              const updateTime = new Date()
              setLastUpdate(updateTime)
              setLastUpdateState(updateTime)
              
              // Invalidate order queries to refresh data
              utils.order.list.invalidate()
              utils.merchant.getDashboard.invalidate(),
              utils.notification.getUnreadCount.invalidate(),
              utils.notification.getNotifications.invalidate()
              
              // Show notification for order updates
              toast({
                title: "Order Updated",
                description: `Order #${data.order.orderNumber} status changed to ${data.order.status}`,
              })
            }
            
            if (data.type === "status_changed") {
              const updateTime = new Date()
              setLastUpdate(updateTime)
              setLastUpdateState(updateTime)
              
              // Invalidate order queries to refresh data
              utils.order.list.invalidate()
              utils.merchant.getDashboard.invalidate(),
              utils.notification.getUnreadCount.invalidate(),
              utils.notification.getNotifications.invalidate()
              
              // Show notification for status changes
              const statusMessages = {
                CONFIRMED: "confirmed and being prepared",
                PREPARING: "being prepared",
                READY: "ready for pickup/delivery",
                OUT_FOR_DELIVERY: "out for delivery",
                DELIVERED: "delivered",
                COMPLETED: "completed",
                CANCELLED: "cancelled",
                REFUNDED: "refunded",
              }
              
              const message = statusMessages[data.order.status as keyof typeof statusMessages] || data.order.status
              
              toast({
                title: "Status Update",
                description: `Order #${data.order.orderNumber} is ${message}`,
                variant: data.order.status === "CANCELLED" ? "destructive" : "default",
              })
            }
            
          } catch (error) {
            console.error("Failed to parse SSE message:", error)
          }
        }
        
        eventSource.onerror = () => {
          console.error("❌ Order stream connection error")
          setIsConnected(false)
          eventSource.close()
          eventSourceRef.current = null
          
          // Exponential backoff for reconnection
          const attempts = reconnectAttemptsRef.current
          if (attempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
            reconnectAttemptsRef.current++
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`🔄 Reconnecting order stream... (attempt ${attempts + 1})`)
              connect()
            }, delay)
          } else {
            console.error("❌ Max reconnection attempts reached for order stream")
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
  }, [user?.id, isAuthenticated, isLoading, isMerchant, toast, utils, setLastUpdate])
  
  // Fallback polling mechanism for robustness
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id || !isMerchant) {
      return
    }
    
    // Poll every 30 seconds as a backup
    const interval = setInterval(() => {
      if (!isConnected) {
        console.log("📊 Fallback polling: refreshing orders")
        utils.order.list.invalidate()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isConnected, user?.id, isAuthenticated, isLoading, isMerchant, utils])
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Browser notifications enabled')
        }
      })
    }
  }, [])
  
  return (
    <OrderStreamContext.Provider value={{ isConnected, lastUpdate }}>
      {children}
    </OrderStreamContext.Provider>
  )
}