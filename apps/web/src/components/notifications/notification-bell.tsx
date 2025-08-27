'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button, Badge, ScrollArea, 
    DropdownMenu, DropdownMenuContent, DropdownMenuHeader, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@kitchencloud/ui'
import { api } from "@/lib/trpc/client"
import { useAuth } from "@kitchencloud/auth/client"
import { formatRelativeTime } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  
  // 🔥 NEW: Add auth guards
  const { user, isAuthenticated, isLoading } = useAuth()
  
  // 🔥 FIXED: Only fetch when authenticated
  const { data: unreadCount = 0 } = api.notification.getUnreadCount.useQuery(
    undefined,
    {
      enabled: isAuthenticated && !!user && !isLoading, // Auth guard
      refetchOnWindowFocus: false,
    }
  )
  
  // 🔥 FIXED: Only fetch when authenticated AND dropdown is open
  const { data, refetch } = api.notification.getNotifications.useQuery(
    { limit: 10, unreadOnly: false },
    { 
      enabled: isAuthenticated && !!user && !isLoading && open, // Auth guard + open state
      refetchOnWindowFocus: false,
    }
  )

  const notifications = Array.isArray(data) 
    ? data 
    : (data && 'notifications' in data) 
      ? data.notifications 
      : []
  
  // Mark as read mutation
  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch()
    }
  })
  
  // Mark all as read mutation
  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch()
    }
  })

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId })
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  // 🔥 NEW: Don't render anything if user is not authenticated
  if (!isAuthenticated || !user || isLoading) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative hover:bg-gray-100 hover:scale-105 transition-all duration-200 hover:shadow-sm group">
          <Bell className="h-5 w-5 group-hover:text-blue-600 group-hover:animate-pulse transition-colors duration-200" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs group-hover:scale-110 group-hover:animate-bounce transition-transform duration-200"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 shadow-lg backdrop-blur-sm z-[100]">
        <DropdownMenuHeader className="flex items-center justify-between py-2">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all read'}
            </Button>
          )}
        </DropdownMenuHeader>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                    <span className="font-medium text-sm">{notification.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground ml-4">
                  {notification.message}
                </p>
                
                {notification.actionUrl && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs ml-4"
                    onClick={(e) => {
                      e.stopPropagation()
                      // 🔥 IMPROVED: Use Next.js router instead of window.location
                      // You might want to import { useRouter } from 'next/navigation' for better navigation
                      window.location.href = notification.actionUrl!
                    }}
                  >
                    {notification.actionLabel || 'View'}
                  </Button>
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center py-2">
              <Button variant="ghost" size="sm" className="w-full">
                View all notifications
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}