import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, merchantProcedure } from '../../core'
import { NotificationService } from '../../../services/notification'
import { NotificationType, NotificationPriority } from '@kitchencloud/database'

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
      const { session } = ctx
      const { limit, offset, unreadOnly, type } = input
      
      const isCustomer = session.user.userType === 'customer'
      
      return await NotificationService.getNotifications({
        userId: session.user.id,
        isCustomer,
        limit,
        offset,
        unreadOnly,
        type,
      })
    }),

  // Get unread count
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const { session } = ctx
      const isCustomer = session.user.userType === 'customer'
      
      return await NotificationService.getUnreadCount(session.user.id, isCustomer)
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
      
      const isOwner = 
        (session.user.userType === 'merchant' && notification.merchantId === session.user.id) ||
        (session.user.userType === 'customer' && notification.customerId === session.user.id)
      
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' })
      }
      
      return await NotificationService.markAsRead(notificationId)
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { session } = ctx
      const isCustomer = session.user.userType === 'customer'
      
      return await NotificationService.markAllAsRead(session.user.id, isCustomer)
    }),

  // Send test notification (merchant only, for testing)
  sendTestNotification: merchantProcedure
    .input(z.object({
      type: z.nativeEnum(NotificationType),
      channels: z.array(z.enum(['in_app', 'email', 'sms', 'whatsapp'])).default(['in_app']),
      priority: z.nativeEnum(NotificationPriority).default('NORMAL'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx
      const { type, channels, priority } = input
      
      // Only allow in development/staging
      if (process.env.NODE_ENV === 'production') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Test notifications not allowed in production' })
      }
      
      return await NotificationService.createNotification({
        merchantId: session.user.id,
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