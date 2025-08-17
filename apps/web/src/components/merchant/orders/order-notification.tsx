"use client"

export function OrderNotification() {
  // For now, just show a simple static notification
  // The real-time updates are still working through React Query invalidation
  
  return null // Disable for now to prevent the connection loop
  
  // In a future implementation, we could:
  // 1. Move the SSE connection to a global provider
  // 2. Use a more stable notification system
  // 3. Implement WebSocket instead of SSE
}