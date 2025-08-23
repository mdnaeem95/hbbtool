'use client'

import { useEffect } from 'react'
import { useToast } from '@kitchencloud/ui'
import { ToastAction } from '@kitchencloud/ui'
import { api } from "@/lib/trpc/client"

export function NotificationToast() {
  const { toast } = useToast()
  const { data: notifications } = api.notification.getNotifications.useQuery(
    { limit: 1, unreadOnly: true },
    { 
      refetchInterval: 30000, // Poll every 30 seconds
      refetchIntervalInBackground: true 
    }
  )

  useEffect(() => {
    if (notifications?.[0]) {
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
  }, [notifications, toast])

  return null
}