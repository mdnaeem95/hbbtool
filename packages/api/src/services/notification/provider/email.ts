import { Resend } from 'resend'
import { db } from '@homejiak/database'

interface EmailData {
  userId: string
  subject: string
  body: string
  data: Record<string, unknown>
}

interface EmailResult {
  success: boolean
  id?: string
}

class EmailProvider {
  private resend: Resend | null = null

  constructor() {
    // Initialize Resend lazily to avoid issues during testing
    if (process.env.NODE_ENV !== 'test') {
      this.resend = new Resend(process.env.RESEND_API_KEY || 'test-key')
    }
  }

  private getResend() {
    if (!this.resend) {
      this.resend = new Resend(process.env.RESEND_API_KEY || 'test-key')
    }
    return this.resend
  }

  async send({ userId, subject, body, data }: EmailData): Promise<EmailResult> {
    try {
      console.log('[email.provider] Starting send for userId:', userId)
      
      // Find the user (try merchant first, then customer)
      const user = await this.findUser(userId)
      if (!user) {
        console.error('[email.provider] User not found:', userId)
        return { success: false }
      }

      console.log('[email.provider] User found:', { email: user.email, type: user.type })

      // Format the email content
      const htmlContent = this.formatEmailHtml(body, data, user)
      console.log('[email.provider] HTML content formatted, length:', htmlContent.length)

      // Send email via Resend
      const resend = this.getResend()
      console.log('[email.provider] Sending email via Resend...')
      
      const response = await resend.emails.send({
        from: 'HomeJiak <noreply@homejiak.sg>',
        to: user.email,
        subject,
        html: htmlContent,
      })

      console.log('[email.provider] Resend response:', response)

      // Handle Resend response format - be more defensive
      if (!response) {
        console.error('[email.provider] No response from Resend')
        return { success: false }
      }

      if (response.error) {
        console.error('[email.provider] Resend error:', response.error)
        return { success: false }
      }

      // Resend response structure: { data: { id: string }, error: null }
      const emailId = response.data?.id
      console.log('[email.provider] Email sent successfully:', {
        id: emailId,
        to: user.email,
        subject,
      })

      return {
        success: true,
        id: emailId,
      }
    } catch (error) {
      console.error('[email.provider] Exception occurred:', error)
      if (error instanceof Error && error.message.includes('Database')) {
        console.error('[email.provider] Database error:', error)
      } else {
        console.error('[email.provider] Send failed:', error)
      }
      return { success: false }
    }
  }

  private async findUser(userId: string) {
    try {
      console.log('[email.provider] Looking up user:', userId)
      
      // Try merchant first
      const merchant = await db.merchant.findUnique({
        where: { id: userId },
        select: {
          email: true,
          businessName: true,
        },
      })

      console.log('[email.provider] Merchant lookup result:', merchant)

      if (merchant && merchant.email) {
        return {
          email: merchant.email,
          name: merchant.businessName || 'Merchant',
          type: 'merchant' as const,
        }
      }

      // Try customer
      const customer = await db.customer.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
        },
      })

      console.log('[email.provider] Customer lookup result:', customer)

      if (customer && customer.email) {
        return {
          email: customer.email,
          name: customer.name || 'Customer',
          type: 'customer' as const,
        }
      }

      return null
    } catch (error) {
      console.error('[email.provider] Database lookup error:', error)
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private formatEmailHtml(
    body: string,
    data: Record<string, unknown>,
    user: { name: string; type: 'merchant' | 'customer' }
  ): string {
    // Simple template replacement
    let formattedBody = body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key]
      if (value === undefined) return match
      
      // Format currency values
      if (key === 'amount' && typeof value === 'number') {
        return value.toFixed(2)
      }
      
      return String(value)
    })

    // Basic HTML email template
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HomeJiak Notification</title>
  <style>
    body {
      font-family: 'Inter', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
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
      font-weight: 700;
      color: #ff6b35;
      text-decoration: none;
    }
    .greeting {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .footer {
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background-color: #ff6b35;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 16px 0;
    }
    .data-section {
      background-color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🍳 HomeJiak</div>
    </div>
    
    <div class="greeting">
      Hello ${user.name}!
    </div>
    
    <div class="content">
      ${formattedBody}
    </div>
    
    ${Object.keys(data).length > 0 ? `
    <div class="data-section">
      <strong>Details:</strong><br>
      ${Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>')}
    </div>
    ` : ''}
    
    <div class="footer">
      <p>
        This email was sent from HomeJiak, Singapore's home-based F&B platform.
        <br>
        <a href="https://homejiak.sg" style="color: #ff6b35;">Visit HomeJiak</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

// Export singleton instance - but handle test environment
export const emailProvider = new EmailProvider()

// Also export the class for testing if needed
export { EmailProvider }