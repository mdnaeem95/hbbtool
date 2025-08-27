import { db, type NotificationType, NotificationPriority } from '@kitchencloud/database'
import { emailProvider } from './provider/email'
import { smsProvider } from './provider/sms'
import { whatsappProvider } from './provider/whatsapp'

type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp'

type Template = {
  title: string
  message: string
}

type NotificationData = {
  merchantId?: string
  customerId?: string
  orderId?: string
  type: NotificationType
  channels?: NotificationChannel[]
  data?: Record<string, unknown>
  priority?: NotificationPriority
}

type NotificationResult = {
  success: boolean
  channels: {
    in_app?: boolean
    email?: { success: boolean; id?: string }
    sms?: { success: boolean; id?: string }
    whatsapp?: { success: boolean; id?: string }
  }
  error?: string
}

export class NotificationService {
  /** Create and fan out a notification across channels. */
  static async createNotification({
    merchantId,
    customerId,
    orderId,
    type,
    channels = ['in_app'],
    data = {},
    priority = NotificationPriority.NORMAL,
  }: NotificationData): Promise<NotificationResult> {
    // Require at least one recipient
    if (!merchantId && !customerId) {
      throw new Error('Notification requires a merchantId or customerId')
    }

    const recipient = merchantId ?? customerId ?? ''
    const dataPayload = { orderId, type, ...data }
    const template = this.getTemplates()[type]
    const title = template?.title ?? this.fallbackTitle(type)
    const message = this.formatMessage(template?.message ?? 'Event: {{type}}', {
      ...data,
      type,
      orderId,
    })

    const result: NotificationResult = {
      success: true,
      channels: {},
    }

    try {
      // 1) In-app (DB) — best effort
      if (channels.includes('in_app')) {
        try {
          await db.notification.create({
            data: {
              ...(merchantId ? { merchant: { connect: { id: merchantId } } } : {}),
              ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
              type,
              title,
              message,
              data: dataPayload,
              channels,
              priority,
            },
          })
          
          result.channels.in_app = true
          console.log('[notification.service] In-app notification created:', {
            type,
            recipient,
            title,
          })
        } catch (error) {
          console.error('[notification.service] In-app notification failed:', error)
          result.channels.in_app = false
        }
      }

      // 2) External channels — parallel execution
      const channelPromises = []

      if (channels.includes('email')) {
        channelPromises.push(
          this.sendEmail(recipient, title, message, dataPayload)
            .then(emailResult => {
              result.channels.email = emailResult
              return emailResult
            })
            .catch(error => {
              console.error('[notification.service] Email failed:', error)
              result.channels.email = { success: false }
              return { success: false }
            })
        )
      }

      if (channels.includes('sms')) {
        channelPromises.push(
          this.sendSMS(recipient, title, message, dataPayload)
            .then(smsResult => {
              result.channels.sms = smsResult
              return smsResult
            })
            .catch(error => {
              console.error('[notification.service] SMS failed:', error)
              result.channels.sms = { success: false }
              return { success: false }
            })
        )
      }

      if (channels.includes('whatsapp')) {
        channelPromises.push(
          this.sendWhatsApp(recipient, title, message, dataPayload)
            .then(whatsappResult => {
              result.channels.whatsapp = whatsappResult
              return whatsappResult
            })
            .catch(error => {
              console.error('[notification.service] WhatsApp failed:', error)
              result.channels.whatsapp = { success: false }
              return { success: false }
            })
        )
      }

      // Wait for all external channels
      await Promise.all(channelPromises)

      // Determine overall success
      const channelResults = Object.values(result.channels)
      const hasAnySuccess = channelResults.some(r => r === true || (typeof r === 'object' && r.success))
      result.success = hasAnySuccess

      return result
    } catch (error) {
      console.error('[notification.service] Notification failed:', error)
      return {
        success: false,
        channels: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /* ---------------- Channel implementations ---------------- */

  private static async sendEmail(
    userId: string,
    subject: string,
    body: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; id?: string }> {
    try {
      // Check if user has email notifications enabled
      const userSettings = await this.getUserNotificationSettings(userId)
      if (!userSettings?.emailNotifications) {
        console.log('[notification.service] Email notifications disabled for user:', userId)
        return { success: false }
      }

      return await emailProvider.send({
        userId,
        subject,
        body,
        data,
      })
    } catch (error) {
      console.error('[notification.service] Email send failed:', error)
      return { success: false }
    }
  }

  private static async sendSMS(
    userId: string,
    title: string,
    message: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; id?: string }> {
    try {
      // Check if user has SMS notifications enabled
      const userSettings = await this.getUserNotificationSettings(userId)
      if (!userSettings?.smsNotifications) {
        console.log('[notification.service] SMS notifications disabled for user:', userId)
        return { success: false }
      }

      // Use the real SMS provider with correct parameters
      return await smsProvider.send({
        userId,
        message, // Use the formatted message
        data,
      })
    } catch (error) {
      console.error('[notification.service] SMS send failed:', error)
      return { success: false }
    }
  }

  private static async sendWhatsApp(
    userId: string,
    title: string,
    message: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; id?: string }> {
    try {
      // Check if user has WhatsApp notifications enabled
      const userSettings = await this.getUserNotificationSettings(userId)
      if (!userSettings?.whatsappNotifications) {
        console.log('[notification.service] WhatsApp notifications disabled for user:', userId)
        return { success: false }
      }

      // Use the real WhatsApp provider with correct parameters
      return await whatsappProvider.send({
        userId,
        title,
        message,
        data,
      })
    } catch (error) {
      console.error('[notification.service] WhatsApp send failed:', error)
      return { success: false }
    }
  }

  /* ---------------- User settings helper ---------------- */

  private static async getUserNotificationSettings(userId: string) {
    try {
      // Try merchant first
      const merchant = await db.merchant.findUnique({
        where: { id: userId },
        select: {
          emailNotifications: true,
          smsNotifications: true,
          whatsappNotifications: true,
          orderNotificationEmail: true,
          orderNotificationPhone: true,
        },
      })

      if (merchant) return merchant

      // Try customer
      const customer = await db.customer.findUnique({
        where: { id: userId },
        select: {
          emailNotifications: true,
          smsNotifications: true,
          whatsappNotifications: true,
        },
      })

      return customer
    } catch (error) {
      console.error('[notification.service] Failed to get user settings:', error)
      return null
    }
  }

  /* ---------------- Template system ---------------- */
  private static getTemplates(): Record<NotificationType, Template> {
    return {
      ORDER_PLACED: {
        title: 'New Order Received',
        message: 'Order {{orderNumber}} from {{customerName}} - ${{amount}}',
      },
      ORDER_PREPARING: {
        title: 'Order preparing',
        message: 'Your order {{orderNumber}} is being prepared. Estimated time: {{estimatedTime}} minutes',
      },
      ORDER_CONFIRMED: {
        title: 'Order Confirmed',
        message: 'Your order {{orderNumber}} has been confirmed. Estimated time: {{estimatedTime}} minutes',
      },
      ORDER_READY: {
        title: 'Order Ready',
        message: 'Your order {{orderNumber}} is ready for {{deliveryMethod}}',
      },
      ORDER_DELIVERED: {
        title: 'Order Delivered',
        message: 'Your order {{orderNumber}} has been delivered. Enjoy your meal!',
      },
      ORDER_CANCELLED: {
        title: 'Order Cancelled',
        message: 'Order {{orderNumber}} has been cancelled. {{reason}}',
      },
      PAYMENT_RECEIVED: {
        title: 'Payment Received',
        message: 'Payment of ${{amount}} received for order {{orderNumber}} via {{paymentMethod}}',
      },
      PAYMENT_FAILED: {
        title: 'Payment Failed',
        message: 'Payment of ${{amount}} failed for order {{orderNumber}} via {{paymentMethod}}',
      },
      REVIEW_RECEIVED: {
        title: 'New Review',
        message: 'You received a {{rating}}-star review from {{customerName}}',
      },
      LOW_STOCK_ALERT: {
        title: 'Low Stock Alert',
        message: '{{productName}} is running low ({{currentStock}} left)',
      },
      PROMOTION_STARTED: {
        title: 'Promotion Started',
        message: 'Your promotion "{{promotionName}}" has just started',
      },
      PROMOTION_ENDING: {
        title: 'Promotion Ending Soon',
        message: 'Your promotion "{{promotionName}}" ends in {{hoursLeft}} hours',
      },
      SYSTEM_MAINTENANCE: {
        title: 'System Maintenance',
        message: 'The system is undergoing maintenance.',
      },
      ACCOUNT_VERIFICATION: {
        title: 'Account verification',
        message: 'Please go to your email and click on the link to verify your account.',
      },
      PASSWORD_RESET: {
        title: 'Password Reset',
        message: 'Please go to your email and click on the link to reset your password.',        
      }
    }
  }

  private static fallbackTitle(type: NotificationType): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  private static formatMessage(template: string, data: Record<string, unknown>): string {
    let message = template
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`
      message = message.replace(new RegExp(placeholder, 'g'), String(value))
    }
    return message
  }

  /* ---------------- Convenience helpers ---------------- */

  static async orderPlaced(opts: {
    merchantId: string
    orderId: string
    customerName?: string
    orderNumber: string
    amount?: number
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }) {
    return this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_PLACED',
      channels: opts.channels || ['in_app', 'email', 'sms'],
      priority: opts.priority || NotificationPriority.HIGH,
      data: {
        customerName: opts.customerName,
        orderNumber: opts.orderNumber,
        amount: opts.amount,
      },
    })
  }

  static async orderReady(opts: {
    customerId: string
    orderId: string
    orderNumber: string
    deliveryMethod?: string
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      customerId: opts.customerId,
      orderId: opts.orderId,
      type: 'ORDER_READY',
      channels: opts.channels || ['in_app', 'sms', 'whatsapp'],
      priority: NotificationPriority.HIGH,
      data: {
        orderNumber: opts.orderNumber,
        deliveryMethod: opts.deliveryMethod || 'pickup',
      },
    })
  }

  static async orderDelivered(opts: {
    customerId: string
    merchantId?: string
    orderId: string
    orderNumber: string
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      customerId: opts.customerId,
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_DELIVERED',
      channels: opts.channels || ['in_app', 'whatsapp'],
      data: {
        orderNumber: opts.orderNumber,
      },
    })
  }

  /* ---------------- Notification Management Methods ---------------- */

  static async getNotifications(opts: {
    userId: string
    isCustomer?: boolean
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: NotificationType
  }) {
    try {
      const {
        userId,
        isCustomer = false,
        limit = 50,
        offset = 0,
        unreadOnly = false,
        type
      } = opts

      // Build where clause
      const baseWhere = isCustomer 
        ? { customerId: userId }
        : { merchantId: userId }

      const where = {
        ...baseWhere,
        ...(unreadOnly ? { read: false } : {}),
        ...(type ? { type } : {}),
      }

      return await db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          merchant: isCustomer ? { select: { businessName: true } } : false,
          customer: !isCustomer ? { select: { name: true } } : false,
        },
      })
    } catch (error) {
      console.error('[notification.service] Failed to get notifications:', error)
      return []
    }
  }

  static async getUnreadCount(userId: string, isCustomer: boolean = false): Promise<number> {
    try {
      const where = isCustomer 
        ? { customerId: userId, read: false }
        : { merchantId: userId, read: false }

      return await db.notification.count({ where })
    } catch (error) {
      console.error('[notification.service] Failed to get unread count:', error)
      return 0
    }
  }

  static async markAsRead(notificationId: string) {
    try {
      return await db.notification.update({
        where: { id: notificationId },
        data: { 
          read: true,
          readAt: new Date(),
        },
      })
    } catch (error) {
      console.error('[notification.service] Failed to mark notification as read:', error)
      throw error
    }
  }

  static async markAllAsRead(userId: string, isCustomer: boolean = false) {
    try {
      const where = isCustomer 
        ? { customerId: userId, read: false }
        : { merchantId: userId, read: false }

      const result = await db.notification.updateMany({
        where,
        data: { 
          read: true,
          readAt: new Date(),
        },
      })

      console.log('[notification.service] Marked all notifications as read:', {
        userId,
        isCustomer,
        count: result.count,
      })

      return result
    } catch (error) {
      console.error('[notification.service] Failed to mark all notifications as read:', error)
      throw error
    }
  }

  static async deleteNotification(notificationId: string) {
    try {
      return await db.notification.delete({
        where: { id: notificationId },
      })
    } catch (error) {
      console.error('[notification.service] Failed to delete notification:', error)
      throw error
    }
  }

  static async cleanupExpiredNotifications() {
    try {
      const result = await db.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      })

      console.log('[notification.service] Cleaned up expired notifications:', result.count)
      return result
    } catch (error) {
      console.error('[notification.service] Failed to cleanup expired notifications:', error)
      throw error
    }
  }
}