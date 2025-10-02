import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, merchantProcedure } from '../../core'
import { NotificationService } from '../../../services/notification'
import { NotificationType, NotificationPriority } from '@homejiak/types'

export const notificationRouter = router({
  // Get notifications for current user
  getNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().default(false),
      type: z.nativeEnum(NotificationType).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Add auth guard
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        })
      }
      
      const { limit, offset, unreadOnly, type } = input
      
      // Handle the case where NotificationService might not exist
      try {
        return await NotificationService.getNotifications({
          userId: ctx.session.user.id,
          limit,
          offset,
          unreadOnly,
          type,
        })
      } catch (error) {
        // If service doesn't exist or fails, return empty array
        console.error('NotificationService error:', error)
        return {
          notifications: [],
          total: 0,
          hasMore: false
        }
      }
    }),

  // Get unread count
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const { session } = ctx
      
      return await NotificationService.getUnreadCount(session?.user.id!)
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = ctx
      const { notificationId } = input
      
      // Verify ownership
      const notification = await db.notification.findUnique({
        where: { id: notificationId },
        select: { merchantId: true, customerId: true }
      })
      
      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found' })
      }
     
      if (notification.merchantId !== session?.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' })
      }
      
      return await NotificationService.markAsRead(notificationId)
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { session } = ctx

      return await NotificationService.markAllAsRead(session?.user.id!)
    }),

  // Send test notification (merchant only, for testing)
  sendTestNotification: merchantProcedure
    .input(z.object({
      type: z.nativeEnum(NotificationType),
      channels: z.array(z.enum(['in_app', 'email', 'sms', 'whatsapp'])).default(['in_app']),
      priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
    }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx
      const { type, channels, priority } = input
      
      // Only allow in development/staging
      if (process.env.NODE_ENV === 'production') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Test notifications not allowed in production' })
      }
      
      return await NotificationService.createNotification({
        merchantId: session?.user.id,
        type,
        channels,
        priority,
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      })
    }),
})