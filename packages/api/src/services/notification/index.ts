import { db, type NotificationType, NotificationPriority } from '@kitchencloud/database'
import { emailProvider } from './provider/email'

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
    // TODO: Implement SMS provider (Twilio)
    console.log('[sms.queue]', { userId, title, message, data })
    return { success: false }
  }

  private static async sendWhatsApp(
    userId: string,
    title: string,
    message: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; id?: string }> {
    // TODO: Implement WhatsApp provider
    console.log('[whatsapp.queue]', { userId, title, message, data })
    return { success: false }
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

  /* ---------------- Convenience helpers ---------------- */

  static async orderPlaced(opts: {
    merchantId: string
    orderId: string
    customerName?: string
    orderNumber: string
    amount?: number
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }): Promise<NotificationResult> {
    return this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_PLACED',
      channels: opts.channels,
      priority: opts.priority,
      data: {
        customerName: opts.customerName,
        orderNumber: opts.orderNumber,
        amount: opts.amount,
      },
    })
  }

  static async orderConfirmed(opts: {
    customerId?: string
    merchantId?: string
    orderId: string
    orderNumber: string
    estimatedTime?: number
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }): Promise<NotificationResult> {
    return this.createNotification({
      customerId: opts.customerId,
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_CONFIRMED',
      channels: opts.channels,
      priority: opts.priority,
      data: {
        orderNumber: opts.orderNumber,
        estimatedTime: opts.estimatedTime,
      },
    })
  }

  static async orderReady(opts: {
    customerId?: string
    merchantId?: string
    orderId: string
    orderNumber: string
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }): Promise<NotificationResult> {
    return this.createNotification({
      customerId: opts.customerId,
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_READY',
      channels: opts.channels,
      priority: opts.priority || NotificationPriority.HIGH,
      data: {
        orderNumber: opts.orderNumber,
      },
    })
  }

  static async paymentReceived(opts: {
    merchantId: string
    orderId: string
    orderNumber: string
    amount: number
    paymentMethod: string
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }): Promise<NotificationResult> {
    return this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'PAYMENT_RECEIVED',
      channels: opts.channels,
      priority: opts.priority,
      data: {
        orderNumber: opts.orderNumber,
        amount: opts.amount,
        paymentMethod: opts.paymentMethod,
      },
    })
  }

  static async lowStockAlert(opts: {
    merchantId: string
    productId: string
    productName: string
    currentStock: number
    threshold: number
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }): Promise<NotificationResult> {
    return this.createNotification({
      merchantId: opts.merchantId,
      type: 'LOW_STOCK_ALERT',
      channels: opts.channels,
      priority: opts.priority || NotificationPriority.HIGH,
      data: {
        productId: opts.productId,
        productName: opts.productName,
        currentStock: opts.currentStock,
        threshold: opts.threshold,
      },
    })
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
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  private static formatMessage(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key]
      if (value === undefined) return match
      
      // Format currency values with 2 decimal places
      if (key === 'amount' && typeof value === 'number') {
        return value.toFixed(2)
      }
      
      return String(value)
    })
  }

  /* ---------------- Bulk operations ---------------- */

  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await db.notification.update({
        where: { id: notificationId },
        data: { 
          read: true, 
          readAt: new Date() 
        },
      })
      return true
    } catch (error) {
      console.error('[notification.service] Mark as read failed:', error)
      return false
    }
  }

  static async markAllAsRead(userId: string, isCustomer = false): Promise<boolean> {
    try {
      const whereCondition = isCustomer 
        ? { customerId: userId, read: false }
        : { merchantId: userId, read: false }

      await db.notification.updateMany({
        where: whereCondition,
        data: { 
          read: true, 
          readAt: new Date() 
        },
      })
      return true
    } catch (error) {
      console.error('[notification.service] Mark all as read failed:', error)
      return false
    }
  }

  static async getUnreadCount(userId: string, isCustomer = false): Promise<number> {
    try {
      const whereCondition = isCustomer 
        ? { customerId: userId, read: false }
        : { merchantId: userId, read: false }

      return await db.notification.count({
        where: whereCondition,
      })
    } catch (error) {
      console.error('[notification.service] Get unread count failed:', error)
      return 0
    }
  }

  static async deleteExpired(): Promise<number> {
    try {
      const now = new Date()
      
      const result = await db.notification.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      })

      const totalDeleted = result.count
      
      if (totalDeleted > 0) {
        console.log(`[notification.service] Deleted ${totalDeleted} expired notifications`)
      }
      
      return totalDeleted
    } catch (error) {
      console.error('[notification.service] Delete expired failed:', error)
      return 0
    }
  }

  /* ---------------- Query helpers ---------------- */

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
        limit = 20,
        offset = 0,
        unreadOnly = false,
        type
      } = opts

      const whereCondition: any = isCustomer 
        ? { customerId: userId }
        : { merchantId: userId }

      if (unreadOnly) {
        whereCondition.read = false
      }

      if (type) {
        whereCondition.type = type
      }

      return await db.notification.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          merchant: isCustomer ? true : false,
          customer: !isCustomer ? true : false,
        },
      })
    } catch (error) {
      console.error('[notification.service] Get notifications failed:', error)
      return []
    }
  }
}