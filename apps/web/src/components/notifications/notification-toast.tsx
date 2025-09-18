'use client'

import { useEffect } from 'react'
import { useToast, ToastAction } from '@kitchencloud/ui'
import { api } from "../../lib/trpc/client"
import { useAuth } from '@kitchencloud/auth/client'

export function NotificationToast() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading } = useAuth()
  
  // Only fetch notifications if user is authenticated
  const { data: notifications } = api.notification.getNotifications.useQuery(
    { limit: 1, unreadOnly: true },
    { 
      enabled: !isLoading && isAuthenticated, // 🔒 Auth guard
      refetchInterval: isAuthenticated ? 30000 : false, // Only poll if authenticated
      refetchIntervalInBackground: isAuthenticated, // Only background refresh if authenticated
      retry: isAuthenticated ? 3 : false, // Don't retry if not authenticated
    }
  )

  useEffect(() => {
    // Only process notifications if user is authenticated
    if (!isAuthenticated || isLoading || !notifications) return
    
    if ('notifications' in notifications && Array.isArray(notifications)) {
      const notification = notifications[0]
      
      // Don't show toast for notifications older than 1 minute
      const isRecent = new Date(notification.createdAt).getTime() > Date.now() - 60000
      
      if (isRecent && !notification.read) {
        toast({
          title: notification.title,
          description: notification.message,
          action: notification.actionUrl ? (
            <ToastAction
              altText={notification.actionLabel || 'View notification'}
              onClick={() => {
                window.location.href = notification.actionUrl!
              }}
            >
              {notification.actionLabel || 'View'}
            </ToastAction>
          ) : undefined,
        })
      }
    }
  }, [notifications, toast, isAuthenticated, isLoading])

  // Return early if not authenticated to avoid any side effects
  if (!isAuthenticated || isLoading) {
    return null
  }

  return null
}