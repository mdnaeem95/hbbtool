import { db, type NotificationType } from '@kitchencloud/database'
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
  priority?: 'low' | 'normal' | 'high'
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
    priority,
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
              ...(priority ? { priority } : {}),
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
  }) {
    return this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_PLACED' as NotificationType,
      channels: opts.channels || ['in_app', 'email'],
      data: { 
        customerName: opts.customerName, 
        orderNumber: opts.orderNumber, 
        amount: opts.amount 
      },
      priority: 'high',
    })
  }

  static async orderConfirmed(opts: {
    customerId?: string
    merchantId?: string
    orderId: string
    orderNumber: string
    estimatedTime?: number
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      customerId: opts.customerId,
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_CONFIRMED' as NotificationType,
      channels: opts.channels || ['in_app', 'sms'],
      data: { 
        orderNumber: opts.orderNumber,
        estimatedTime: opts.estimatedTime
      },
      priority: 'high',
    })
  }

  static async orderReady(opts: {
    customerId?: string
    merchantId?: string
    orderId: string
    orderNumber: string
    deliveryMethod?: string
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      customerId: opts.customerId,
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_READY' as NotificationType,
      channels: opts.channels || ['in_app', 'sms', 'whatsapp'],
      data: { 
        orderNumber: opts.orderNumber,
        deliveryMethod: opts.deliveryMethod
      },
      priority: 'high',
    })
  }

  static async orderDelivered(opts: {
    customerId?: string
    merchantId?: string
    orderId: string
    orderNumber: string
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      customerId: opts.customerId,
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_DELIVERED' as NotificationType,
      channels: opts.channels || ['in_app', 'email'],
      data: { 
        orderNumber: opts.orderNumber
      },
      priority: 'normal',
    })
  }

  static async paymentReceived(opts: {
    merchantId: string
    orderId: string
    orderNumber: string
    amount: number
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'PAYMENT_RECEIVED' as NotificationType,
      channels: opts.channels || ['in_app', 'email'],
      data: { orderNumber: opts.orderNumber, amount: opts.amount },
      priority: 'normal',
    })
  }

  static async lowStockAlert(opts: {
    merchantId: string
    productId: string
    productName: string
    currentQuantity: number
    channels?: NotificationChannel[]
  }) {
    return this.createNotification({
      merchantId: opts.merchantId,
      type: 'LOW_STOCK_ALERT' as NotificationType,
      channels: opts.channels || ['in_app', 'email'],
      data: {
        productId: opts.productId,
        productName: opts.productName,
        currentQuantity: opts.currentQuantity,
      },
      priority: 'high',
    })
  }

  /* ---------------- Templates & formatting ---------------- */

  private static getTemplates(): Partial<Record<NotificationType, Template>> {
    return {
      ORDER_PLACED: {
        title: 'New Order Received! 🎉',
        message: 'You have a new order #{{orderNumber}} from {{customerName}} for ${{amount}}',
      },
      ORDER_CONFIRMED: {
        title: 'Order Confirmed ✅',
        message: 'Your order #{{orderNumber}} has been confirmed and will be ready in {{estimatedTime}} minutes',
      },
      ORDER_READY: {
        title: 'Order Ready! 🍽️',
        message: 'Your order #{{orderNumber}} is ready for {{deliveryMethod}}',
      },
      ORDER_DELIVERED: {
        title: 'Order Delivered 🚚',
        message: 'Your order #{{orderNumber}} has been delivered. Enjoy your meal!',
      },
      ORDER_CANCELLED: {
        title: 'Order Cancelled ❌',
        message: 'Order #{{orderNumber}} has been cancelled',
      },
      PAYMENT_RECEIVED: {
        title: 'Payment Received 💰',
        message: 'Payment of ${{amount}} received for order #{{orderNumber}}',
      },
      REVIEW_RECEIVED: {
        title: 'New Review ⭐',
        message: '{{customerName}} left a {{rating}}★ review for your business',
      },
      LOW_STOCK_ALERT: {
        title: 'Low Stock Alert ⚠️',
        message: '{{productName}} is running low ({{currentQuantity}} left)',
      },
    }
  }

  private static fallbackTitle(type: NotificationType) {
    // Humanize enum-like strings: PAYMENT_RECEIVED -> "Payment received"
    const s = String(type).toLowerCase().replace(/_/g, ' ')
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  /** Simple handlebars-style substitution for `{{key}}`. */
  private static formatMessage(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
      const val = data[key.trim()]
      return (val ?? '').toString()
    })
  }
}