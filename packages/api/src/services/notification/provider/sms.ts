import { db } from '@homejiak/database'

// Use require for Twilio to avoid ESM issues
let Twilio: any
try {
  // Dynamic import for CommonJS compatibility
  Twilio = require('twilio')
} catch (error) {
  console.error('Failed to load Twilio:', error)
}

// Initialize Twilio client with error handling
const getTwilioClient = () => {
  if (!Twilio) {
    throw new Error('Twilio module not loaded')
  }
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured')
  }
  
  return new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
}

interface SMSProviderOptions {
  userId: string
  message: string
  data?: Record<string, unknown>
}

interface SMSResult {
  success: boolean
  id?: string
  error?: string
}

export const smsProvider = {
  async send({ userId, message, data = {} }: SMSProviderOptions): Promise<SMSResult> {
    try {
      // Get user details and phone number
      const user = await this.getUserDetails(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      if (!user.phone) {
        return { success: false, error: 'No phone number on file' }
      }

      // Check if SMS notifications are enabled
      if (user.smsNotifications === false) {
        console.log('[sms.provider] SMS notifications disabled for user:', userId)
        return { success: false, error: 'SMS notifications disabled' }
      }

      // Format Singapore phone number (+65)
      const formattedPhone = this.formatSingaporePhone(user.phone)
      if (!formattedPhone) {
        return { success: false, error: 'Invalid phone number format' }
      }

      // Format message for SMS (160 char limit)
      const formattedMessage = this.formatMessage(message, data, user)
      const truncatedMessage = formattedMessage.length > 160 
        ? formattedMessage.substring(0, 157) + '...'
        : formattedMessage

      // Get Twilio client
      const twilio = getTwilioClient()

      // Send SMS via Twilio
      const smsResult = await twilio.messages.create({
        body: truncatedMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
        statusCallback: process.env.APP_URL 
          ? `${process.env.APP_URL}/api/webhooks/twilio/status`
          : undefined,
      })

      console.log('[sms.provider] SMS sent successfully:', {
        userId,
        to: formattedPhone,
        messageId: smsResult.sid,
      })

      return {
        success: true,
        id: smsResult.sid,
      }

    } catch (error) {
      console.error('[sms.provider] SMS send failed:', error)
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
          orderNotificationPhone: true, // Prefer dedicated notification phone
          smsNotifications: true,
        },
      })

      if (merchant) {
        return {
          phone: merchant.orderNotificationPhone || merchant.phone,
          name: merchant.businessName,
          smsNotifications: merchant.smsNotifications,
        }
      }

      // Try customer
      const customer = await db.customer.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          name: true,
          smsNotifications: true,
        },
      })

      if (customer) {
        return {
          phone: customer.phone,
          name: customer.name,
          smsNotifications: customer.smsNotifications,
        }
      }

      return null
    } catch (error) {
      console.error('[sms.provider] Failed to get user details:', error)
      return null
    }
  },

  formatSingaporePhone(phone: string): string | null {
    if (!phone) return null

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')

    // Handle different formats:
    // - 8-digit local: 91234567 -> +6591234567
    // - 9-digit with leading 0: 091234567 -> +6591234567  
    // - 10-digit with 65: 6591234567 -> +6591234567
    // - Already formatted: +6591234567 -> +6591234567

    if (digits.length === 8 && (digits.startsWith('8') || digits.startsWith('9'))) {
      return `+65${digits}`
    } else if (digits.length === 9 && digits.startsWith('0')) {
      return `+65${digits.substring(1)}`
    } else if (digits.length === 10 && digits.startsWith('65')) {
      return `+${digits}`
    } else if (digits.length === 12 && digits.startsWith('65')) {
      return `+${digits}`
    }

    // If already has +65 prefix
    if (phone.startsWith('+65') && digits.length >= 10) {
      return phone
    }

    console.warn('[sms.provider] Invalid phone format:', phone)
    return null
  },

  formatMessage(message: string, data: Record<string, unknown>, user: any): string {
    let formatted = message

    // Replace common variables
    const replacements: Record<string, string> = {
      '{{customerName}}': user.name || 'Valued Customer',
      '{{businessName}}': user.name || 'Merchant',
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

// Rate limiting helper
export const smsRateLimit = {
  // Track SMS sends per user to prevent spam
  private: new Map<string, { count: number; resetTime: number }>(),

  async checkLimit(userId: string, maxPerHour = 10): Promise<boolean> {
    const now = Date.now()
    const hourInMs = 60 * 60 * 1000
    
    const userLimits = this.private.get(userId)
    
    if (!userLimits || now > userLimits.resetTime) {
      // Reset or create new limit
      this.private.set(userId, { count: 1, resetTime: now + hourInMs })
      return true
    }
    
    if (userLimits.count >= maxPerHour) {
      return false // Rate limited
    }
    
    // Increment count
    userLimits.count++
    return true
  },

  // Clear rate limits (useful for testing)
  clear() {
    this.private.clear()
  }
}