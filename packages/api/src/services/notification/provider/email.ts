import { Resend } from 'resend'
import { db } from '@kitchencloud/database'

interface EmailData {
  userId: string
  subject: string
  body: string
  data: Record<string, unknown>
}

interface EmailProvider {
  send(params: EmailData): Promise<{ id: string; success: boolean }>
}

class ResendEmailProvider implements EmailProvider {
  private resend: Resend

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    this.resend = new Resend(apiKey)
  }

  async send({ userId, subject, body, data }: EmailData): Promise<{ id: string; success: boolean }> {
    try {
      // Get user email from database
      const user = await this.getUserEmail(userId)
      if (!user?.email) {
        throw new Error('User email not found')
      }

      // Send email via Resend
      const result = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'KitchenCloud <notifications@kitchencloud.sg>',
        to: user.email,
        subject,
        html: this.generateEmailHTML(subject, body, data, user),
        text: this.generateEmailText(body, data),
        tags: [
          { name: 'service', value: 'notifications' },
          { name: 'type', value: data.type as string || 'general' },
          { name: 'userId', value: userId },
        ],
      })

      if (result.error) {
        console.error('[email.provider] Resend error:', result.error)
        return { id: '', success: false }
      }

      console.log('[email.provider] Email sent successfully:', {
        id: result.data?.id,
        to: user.email,
        subject,
      })

      return { id: result.data?.id || '', success: true }
    } catch (error) {
      console.error('[email.provider] Failed to send email:', error)
      return { id: '', success: false }
    }
  }

  private async getUserEmail(userId: string): Promise<{ email: string; name?: string } | null> {
    try {
      // Try merchant first
      const merchant = await db.merchant.findUnique({
        where: { id: userId },
        select: { email: true, businessName: true },
      })

      if (merchant?.email) {
        return {
          email: merchant.email,
          name: merchant.businessName,
        }
      }

      // Try customer (now has email field like merchant)
      const customer = await db.customer.findUnique({
        where: { id: userId },
        select: { email: true, name: true, preferredName: true },
      })

      if (customer?.email) {
        return {
          email: customer.email,
          name: customer.preferredName || customer.name,
        }
      }

      return null
    } catch (error) {
      console.error('[email.provider] Failed to get user email:', error)
      return null
    }
  }

  private generateEmailHTML(
    subject: string,
    body: string,
    data: Record<string, unknown>,
    user: { email: string; name?: string }
  ): string {
    const recipientName = user.name || 'there'
    const currentYear = new Date().getFullYear()

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #ff6b35;
      margin-bottom: 8px;
    }
    .tagline {
      color: #6b7280;
      font-size: 14px;
    }
    .content {
      margin-bottom: 32px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background-color: #f3f4f6;
      border-radius: 8px;
      border-left: 4px solid #ff6b35;
    }
    .button {
      display: inline-block;
      background: #ff6b35;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .order-details {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .order-details h3 {
      margin: 0 0 12px 0;
      color: #374151;
    }
    .order-details p {
      margin: 4px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🍳 KitchenCloud</div>
      <div class="tagline">Your Home-Based Food Business Platform</div>
    </div>
    
    <div class="content">
      <div class="greeting">Hi ${recipientName},</div>
      
      <div class="message">
        ${body}
      </div>

      ${this.generateOrderDetails(data)}
      
      ${this.generateActionButton(data)}
    </div>
    
    <div class="footer">
      <p>&copy; ${currentYear} KitchenCloud. Made with ❤️ in Singapore.</p>
      <p>This email was sent to ${user.email}. If you no longer wish to receive these emails, please update your notification preferences.</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateEmailText(body: string, data: Record<string, unknown>): string {
    let text = `Hi there,\n\n${body}\n\n`
    
    if (data.orderNumber) {
      text += `Order: ${data.orderNumber}\n`
    }
    if (data.amount) {
      text += `Amount: $${data.amount}\n`
    }
    if (data.customerName) {
      text += `Customer: ${data.customerName}\n`
    }
    
    text += '\n---\nKitchenCloud - Your Home-Based Food Business Platform\n'
    text += 'Made with ❤️ in Singapore\n'
    
    return text
  }

  private generateOrderDetails(data: Record<string, unknown>): string {
    if (!data.orderNumber && !data.amount && !data.customerName) {
      return ''
    }

    let details = '<div class="order-details"><h3>Order Details</h3>'
    
    if (data.orderNumber) {
      details += `<p><strong>Order Number:</strong> ${data.orderNumber}</p>`
    }
    if (data.customerName) {
      details += `<p><strong>Customer:</strong> ${data.customerName}</p>`
    }
    if (data.amount) {
      details += `<p><strong>Amount:</strong> $${data.amount}</p>`
    }
    if (data.deliveryMethod) {
      details += `<p><strong>Delivery Method:</strong> ${data.deliveryMethod}</p>`
    }
    
    details += '</div>'
    return details
  }

  private generateActionButton(data: Record<string, unknown>): string {
    if (data.orderId) {
      return `<a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${data.orderId}" class="button">View Order</a>`
    }
    if (data.type === 'LOW_STOCK_ALERT' && data.productId) {
      return `<a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/products/${data.productId}" class="button">Update Stock</a>`
    }
    return ''
  }
}

// Export singleton instance
export const emailProvider = new ResendEmailProvider()