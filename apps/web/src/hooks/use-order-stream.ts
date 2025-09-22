import { useEffect, useRef, useCallback, useState } from 'react'
import { api } from '../lib/trpc/client'
import { useToast } from '@homejiak/ui'
import { useOrderStore } from '../stores/order-store'

interface OrderStreamOptions {
  enabled?: boolean
  onNewOrder?: (order: any) => void
  onOrderUpdate?: (order: any) => void
  onStatusChange?: (data: { order: any; event: string; data: any }) => void
  playSound?: boolean
}

export function useOrderStream({
  enabled = true,
  onNewOrder,
  onOrderUpdate,
  onStatusChange,
  playSound = true,
}: OrderStreamOptions = {}) {
  const { toast } = useToast()
  const utils = api.useUtils()
  const { setLastUpdate } = useOrderStore()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  
  // Store callbacks in refs to avoid recreating functions
  const callbacksRef = useRef({ onNewOrder, onOrderUpdate, onStatusChange })
  useEffect(() => {
    callbacksRef.current = { onNewOrder, onOrderUpdate, onStatusChange }
  }, [onNewOrder, onOrderUpdate, onStatusChange])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!playSound) return
    
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800 // Frequency in Hz
      gainNode.gain.value = 0.1 // Volume
      
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.2) // Play for 200ms
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }, [playSound])

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (eventSourceRef.current) {
        console.log('[OrderStream] Disconnecting...')
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      return
    }

    // Already connected
    if (eventSourceRef.current) {
      return
    }

    const connect = () => {
      try {
        console.log('[OrderStream] Connecting...')
        const eventSource = new EventSource('/api/orders/stream')
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          console.log('[OrderStream] Connection opened')
          setIsConnected(true)
          setConnectionError(null)
          reconnectAttemptsRef.current = 0
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            switch (data.type) {
              case 'connected':
                console.log('[OrderStream] Connected to real-time updates')
                break

              case 'new_order':
                // Play sound for new orders
                playNotificationSound()
                
                // Show toast notification
                toast({
                  title: "New Order!",
                  description: `Order #${data.order.orderNumber} received`,
                  duration: 5000,
                })
                
                // Update the order list
                utils.order.list.invalidate()
                setLastUpdate(new Date())
                
                // Call custom handler if provided
                callbacksRef.current.onNewOrder?.(data.order)
                break

              case 'order_updated':
                // Update specific order in cache
                utils.order.get.setData(
                  { id: data.order.id },
                  data.order
                )
                
                // Update order list
                utils.order.list.invalidate()
                setLastUpdate(new Date())
                
                // Call custom handler if provided
                callbacksRef.current.onOrderUpdate?.(data.order)
                break

              case 'status_changed':
                // Play sound for certain status changes
                if (['CONFIRMED', 'READY', 'CANCELLED'].includes(data.order.status)) {
                  playNotificationSound()
                }
                
                // Show toast for important status changes
                if (data.order.status === 'CANCELLED') {
                  toast({
                    title: "Order Cancelled",
                    description: `Order #${data.order.orderNumber} has been cancelled`,
                    variant: "destructive",
                  })
                } else if (data.order.status === 'READY') {
                  toast({
                    title: "Order Ready!",
                    description: `Order #${data.order.orderNumber} is ready for pickup/delivery`,
                  })
                }
                
                // Update caches
                utils.order.get.setData(
                  { id: data.order.id },
                  data.order
                )
                utils.order.list.invalidate()
                setLastUpdate(new Date())
                
                // Call custom handler if provided
                callbacksRef.current.onStatusChange?.(data)
                break

              case 'heartbeat':
                // Keep connection alive
                break

              default:
                console.log('[OrderStream] Unknown message type:', data.type)
            }
          } catch (error) {
            console.error('[OrderStream] Failed to parse message:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('[OrderStream] Connection error:', error)
          setIsConnected(false)
          setConnectionError('Connection lost. Retrying...')
          
          // Close the connection
          eventSource.close()
          eventSourceRef.current = null
          
          // Exponential backoff for reconnection
          const attempts = reconnectAttemptsRef.current
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000) // Max 30s
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1
            connect()
          }, delay)
        }
      } catch (error) {
        console.error('[OrderStream] Failed to create EventSource:', error)
        setConnectionError('Failed to establish connection')
      }
    }

    // Initial connection
    connect()

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        console.log('[OrderStream] Disconnecting...')
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [enabled, playNotificationSound, toast, utils, setLastUpdate])

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttemptsRef.current = 0
    setConnectionError(null)
    setIsConnected(false)
    
    // Force re-run the effect by toggling a state
    // This is a workaround since we can't directly call connect
  }, [])

  return {
    isConnected,
    connectionError,
    reconnect,
  }
}