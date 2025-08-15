import { db, type NotificationType } from '@kitchencloud/database'

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
  // optional priority if your schema supports it
  priority?: 'low' | 'normal' | 'high'
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
  }: NotificationData) {
    // Require at least one recipient
    if (!merchantId && !customerId) {
      throw new Error('Notification requires a merchantId or customerId')
    }

    const dataPayload = { orderId, ...data }
    const template = this.getTemplates()[type]
    const title = template?.title ?? this.fallbackTitle(type)
    const message = this.formatMessage(template?.message ?? 'Event: {{type}}', {
      ...data,
      type,
      orderId,
    })

    // 1) In-app (DB) — best effort
    if (channels.includes('in_app')) {
      await db.notification.create({
        data: {
          merchant: { connect: { id: merchantId } },
          ...(customerId ? { customer: { connect: { id: customerId } } } : {}),

          type,
          title,
          message,
          data: dataPayload,
          channels,

          ...(priority ? { priority } : {}),
        },
      }).catch(() => {})
    }

    // 2) Async channels — queue/stub for now
    const recipient = merchantId ?? customerId ?? ''
    await Promise.all([
      channels.includes('email') && this.queueEmail(recipient, title, message, data),
      channels.includes('sms') && this.queueSMS(recipient, title, message, data),
      channels.includes('whatsapp') && this.queueWhatsApp(recipient, title, message, data),
    ])
  }

  /* ---------------- Convenience helpers ---------------- */

  static async orderPlaced(opts: {
    merchantId: string
    orderId: string
    customerName?: string
    orderNumber: string
    amount?: number
  }) {
    await this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'ORDER_PLACED' as NotificationType,
      channels: ['in_app'],
      data: { customerName: opts.customerName, orderNumber: opts.orderNumber, amount: opts.amount },
      priority: 'high',
    })
  }

  static async paymentReceived(opts: {
    merchantId: string
    orderId: string
    orderNumber: string
    amount: number
  }) {
    await this.createNotification({
      merchantId: opts.merchantId,
      orderId: opts.orderId,
      type: 'PAYMENT_RECEIVED' as NotificationType,
      channels: ['in_app'],
      data: { orderNumber: opts.orderNumber, amount: opts.amount },
    })
  }

  static async lowStockAlert(opts: {
    merchantId: string
    productId: string
    productName: string
    currentQuantity: number
  }) {
    await this.createNotification({
      merchantId: opts.merchantId,
      type: 'LOW_STOCK_ALERT' as NotificationType,
      channels: ['in_app'],
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
        title: 'New Order Received',
        message: 'You have a new order #{{orderNumber}} from {{customerName}}',
      },
      ORDER_CONFIRMED: {
        title: 'Order Confirmed',
        message: 'Order #{{orderNumber}} has been confirmed',
      },
      ORDER_READY: {
        title: 'Order Ready',
        message: 'Order #{{orderNumber}} is ready for {{deliveryMethod}}',
      },
      ORDER_DELIVERED: {
        title: 'Order Delivered',
        message: 'Order #{{orderNumber}} has been delivered',
      },
      ORDER_CANCELLED: {
        title: 'Order Cancelled',
        message: 'Order #{{orderNumber}} has been cancelled',
      },
      PAYMENT_RECEIVED: {
        title: 'Payment Received',
        message: 'Payment of ${{amount}} received for order #{{orderNumber}}',
      },
      REVIEW_RECEIVED: {
        title: 'New Review',
        message: '{{customerName}} left a {{rating}}★ review',
      },
      LOW_STOCK_ALERT: {
        title: 'Low Stock Alert',
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

  /* ---------------- Channel queues (stubs) ---------------- */

  private static async queueEmail(
    userId: string,
    subject: string,
    body: string,
    data: Record<string, unknown>
  ) {
    // TODO: plug in Resend/SendGrid, etc.
    console.log('[email.queue]', { userId, subject, body, data })
  }

  private static async queueSMS(
    userId: string,
    title: string,
    message: string,
    data: Record<string, unknown>
  ) {
    // TODO: plug in Twilio/Sinch
    console.log('[sms.queue]', { userId, title, message, data })
  }

  private static async queueWhatsApp(
    userId: string,
    title: string,
    message: string,
    data: Record<string, unknown>
  ) {
    // TODO: plug in WhatsApp Business API
    console.log('[whatsapp.queue]', { userId, title, message, data })
  }
}