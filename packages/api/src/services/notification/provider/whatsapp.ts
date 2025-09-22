import { db } from '@homejiak/database'

interface WhatsAppProviderOptions {
  userId: string
  title?: string
  message: string
  data?: Record<string, unknown>
}

interface WhatsAppResult {
  success: boolean
  id?: string
  error?: string
}

interface WhatsAppTemplate {
  name: string
  components: Array<{
    type: string
    parameters?: Array<{
      type: string
      text: string
    }>
  }>
}

// WhatsApp API Response Types
interface WhatsAppApiResponse {
  messaging_product: string
  contacts: Array<{
    input: string
    wa_id: string
  }>
  messages: Array<{
    id: string
  }>
}

interface WhatsAppApiError {
  error: {
    message: string
    type: string
    code: number
  }
}

export const whatsappProvider = {
  async send({ userId, title, message, data = {} }: WhatsAppProviderOptions): Promise<WhatsAppResult> {
    try {
      // Get user details and phone number
      console.log(title)
      const user = await whatsappProvider.getUserDetails(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      if (!user.phone) {
        return { success: false, error: 'No WhatsApp number on file' }
      }

      if (!user.whatsappNotifications) {
        console.log('[whatsapp.provider] WhatsApp notifications disabled for user:', userId)
        return { success: false, error: 'WhatsApp notifications disabled' }
      }

      // Format Singapore phone number for WhatsApp API (no + prefix)
      const formattedPhone = whatsappProvider.formatWhatsAppPhone(user.phone)
      if (!formattedPhone) {
        return { success: false, error: 'Invalid WhatsApp phone number format' }
      }

      // Determine template based on message content or data
      const template = whatsappProvider.selectTemplate(data)
      
      let whatsappResult
      if (template) {
        // Use approved template message
        whatsappResult = await whatsappProvider.sendTemplateMessage(formattedPhone, template, data, user)
      } else {
        // Send as text message (may require prior customer interaction)
        whatsappResult = await whatsappProvider.sendTextMessage(formattedPhone, message, data, user)
      }

      console.log('[whatsapp.provider] WhatsApp message sent:', {
        userId,
        to: formattedPhone,
        messageId: whatsappResult.messageId,
        template: template?.name || 'text',
      })

      return {
        success: true,
        id: whatsappResult.messageId,
      }

    } catch (error) {
      console.error('[whatsapp.provider] WhatsApp send failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  async getUserDetails(userId: string) {
    try {
      // Try merchant first
      const merchant = await db.merchant.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          businessName: true,
          orderNotificationPhone: true,
          whatsappNotifications: true,
        },
      })

      if (merchant) {
        return {
          phone: merchant.orderNotificationPhone || merchant.phone,
          name: merchant.businessName,
          whatsappNotifications: merchant.whatsappNotifications,
        }
      }

      // Try customer
      const customer = await db.customer.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          name: true,
          whatsappNotifications: true,
        },
      })

      if (customer) {
        return {
          phone: customer.phone,
          name: customer.name,
          whatsappNotifications: customer.whatsappNotifications,
        }
      }

      return null
    } catch (error) {
      console.error('[whatsapp.provider] Failed to get user details:', error)
      return null
    }
  },

  formatWhatsAppPhone(phone: string): string | null {
    if (!phone) return null

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')

    // WhatsApp API expects format: 6512345678 (no + prefix)
    if (digits.length === 8) {
      return `65${digits}` // Local number -> 65XXXXXXXX
    } else if (digits.length === 9 && digits.startsWith('0')) {
      return `65${digits.substring(1)}` // Remove leading 0
    } else if (digits.length === 10 && digits.startsWith('65')) {
      return digits // Already correct format
    } else if (digits.length === 12 && digits.startsWith('65')) {
      return digits.substring(0, 10) // Remove country code duplication
    }

    // If already has +65 prefix, remove it
    if (phone.startsWith('+65')) {
      const cleaned = phone.replace('+65', '')
      return `65${cleaned.replace(/\D/g, '')}`
    }

    console.warn('[whatsapp.provider] Invalid WhatsApp phone format:', phone)
    return null
  },

  selectTemplate(data: Record<string, unknown>): WhatsAppTemplate | null {
    // Map notification types to approved WhatsApp templates
    const type = data.type as string
    
    switch (type) {
      case 'ORDER_PLACED':
      case 'ORDER_CONFIRMED':
        return {
          name: 'order_confirmation',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(data.orderNumber || '') },
                { type: 'text', text: String(data.customerName || '') },
                { type: 'text', text: String(data.amount || '') }
              ]
            }
          ]
        }
      
      case 'ORDER_READY':
        return {
          name: 'order_ready',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(data.orderNumber || '') },
                { type: 'text', text: String(data.customerName || '') }
              ]
            }
          ]
        }
      
      case 'ORDER_DELIVERED':
        return {
          name: 'order_delivered',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(data.orderNumber || '') }
              ]
            }
          ]
        }
      
      default:
        return null // Fall back to text message
    }
  },

  async sendTemplateMessage(
    to: string, 
    template: WhatsAppTemplate, 
    data?: Record<string, unknown>,
    user?: any
  ): Promise<{ messageId: string }> {
    console.log(data, user)
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template.name,
            language: { code: 'en' }, // TODO: Use user's language preference
            components: template.components,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json() as WhatsAppApiError
      throw new Error(`WhatsApp API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const result = await response.json() as WhatsAppApiResponse
    return { messageId: result.messages[0]?.id! }
  },

  async sendTextMessage(
    to: string, 
    message: string, 
    data: Record<string, unknown>,
    user: any
  ): Promise<{ messageId: string }> {
    // Format message with variables
    const formattedMessage = whatsappProvider.formatMessage(message, data, user)

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: formattedMessage },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json() as WhatsAppApiError
      throw new Error(`WhatsApp API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const result = await response.json() as WhatsAppApiResponse
    return { messageId: result.messages[0]?.id! }
  },

  formatMessage(message: string, data: Record<string, unknown>, user: any): string {
    let formatted = message

    // Replace common variables
    const replacements: Record<string, string> = {
      '{{customerName}}': user.name || 'Valued Customer',
      '{{businessName}}': user.name || 'HomeJiak Merchant',
      ...Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          `{{${key}}}`,
          String(value)
        ])
      ),
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      formatted = formatted.replace(new RegExp(placeholder, 'g'), value)
    }

    return formatted
  },
}

// WhatsApp opt-in management
export const whatsappOptIn = {
  async recordOptIn(userId: string, phone: string): Promise<void> {
    try {
      // Only update existing merchants - don't create new ones
      const merchant = await db.merchant.findUnique({
        where: { id: userId },
        select: { id: true }
      })

      if (!merchant) {
        throw new Error(`Merchant ${userId} not found - cannot record WhatsApp opt-in`)
      }

      // Update existing merchant with opt-in data
      await db.merchant.update({
        where: { id: userId },
        data: { 
          phone, // Update phone if provided
          whatsappNotifications: true,
        },
      })

      console.log('[whatsapp.optin] User opted in:', { userId, phone })
    } catch (error) {
      console.error('[whatsapp.optin] Failed to record opt-in:', error)
      throw error // Re-throw so caller knows it failed
    }
  },

  async recordOptOut(userId: string): Promise<void> {
    try {
      // Only update existing merchants
      const merchant = await db.merchant.findUnique({
        where: { id: userId },
        select: { id: true }
      })

      if (!merchant) {
        throw new Error(`Merchant ${userId} not found - cannot record WhatsApp opt-out`)
      }

      // Record opt-out (basic schema - no whatsappOptedOutAt field)
      await db.merchant.update({
        where: { id: userId },
        data: { 
          whatsappNotifications: false,
        },
      })

      console.log('[whatsapp.optin] User opted out:', { userId })
    } catch (error) {
      console.error('[whatsapp.optin] Failed to record opt-out:', error)
      throw error
    }
  },

  async checkOptInStatus(userId: string): Promise<boolean> {
    try {
      const user = await db.merchant.findUnique({
        where: { id: userId },
        select: { whatsappNotifications: true },
      })

      return user?.whatsappNotifications ?? false
    } catch (error) {
      console.error('[whatsapp.optin] Failed to check opt-in status:', error)
      return false
    }
  },
}