import { db } from '@kitchencloud/database'
import { type NotificationType } from '@kitchencloud/database'

interface NotificationData {
  merchantId?: string
  customerId?: string
  orderId?: string
  type: NotificationType
  channels?: string[]
  data?: any
}

export class NotificationService {
  static async createNotification({
    merchantId,
    customerId,
    orderId,
    type,
    channels = ['in_app'],
    data,
  }: NotificationData) {
    const templates = this.getNotificationTemplates()
    const template = templates[type]
    
    if (!template) {
      console.error(`No template found for notification type: ${type}`)
      return
    }
    
    // Create in-app notification
    if (merchantId && channels.includes('in_app')) {
      await db.notification.create({
        data: {
          merchantId,
          type,
          title: template.title,
          message: this.formatMessage(template.message, data),
          data: { orderId, ...data },
          channels,
        },
      })
    }
    
    // Queue other channels
    if (channels.includes('email')) {
      await this.queueEmail(merchantId || customerId || '', template, data)
    }
    
    if (channels.includes('sms')) {
      await this.queueSMS(merchantId || customerId || '', template, data)
    }
    
    if (channels.includes('whatsapp')) {
      await this.queueWhatsApp(merchantId || customerId || '', template, data)
    }
  }
  
  private static getNotificationTemplates() {
    return {
      ORDER_PLACED: {
        title: 'New Order Received!',
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
        message: '{{customerName}} left a {{rating}}-star review',
      },
    }
  }
  
  private static formatMessage(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }
  
  private static async queueEmail(userId: string, template: any, data: any) {
    // TODO: Integrate with email service (Resend)
    console.log('Queueing email:', { userId, template, data })
  }
  
  private static async queueSMS(userId: string, template: any, data: any) {
    // TODO: Integrate with SMS service (Twilio)
    console.log('Queueing SMS:', { userId, template, data })
  }
  
  private static async queueWhatsApp(userId: string, template: any, data: any) {
    // TODO: Integrate with WhatsApp Business API
    console.log('Queueing WhatsApp:', { userId, template, data })
  }
}