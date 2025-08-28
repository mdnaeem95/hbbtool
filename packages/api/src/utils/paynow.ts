// packages/api/src/utils/paynow.ts
import QRCode from 'qrcode'

/**
 * Generate SGQR-compliant PayNow QR code
 * Based on EMVCo QR Code Specification for Payment Systems
 */
export async function generatePayNowQR(
  phoneOrUEN: string,
  amount: number,
  refNumber?: string,
  merchantName?: string
): Promise<string> {
  const fields: Record<string, string> = {}
  
  // Payload Format Indicator
  fields['00'] = '01'
  
  // Point of Initiation Method (12 = Dynamic)
  fields['01'] = '12'
  
  // Merchant Account Information (PayNow)
  const isPhone = /^[89]\d{7}$/.test(phoneOrUEN)
  let accountInfo = ''
  
  if (isPhone) {
    // Mobile number format
    const formattedPhone = `+65${phoneOrUEN}`
    accountInfo = '0012' + formattedPhone
  } else {
    // UEN format
    accountInfo = '02' + padLeft(phoneOrUEN.length.toString(), 2, '0') + phoneOrUEN
  }
  
  // Add proxy type (0 = mobile, 2 = UEN) and editability (1 = editable amount)
  accountInfo += '0301'
  
  // Build merchant account field
  fields['26'] = '0009SG.PAYNOW' + padLeft(accountInfo.length.toString(), 2, '0') + accountInfo
  
  // Transaction Currency (SGD)
  fields['53'] = '702'
  
  // Transaction Amount (optional)
  if (amount > 0) {
    fields['54'] = amount.toFixed(2)
  }
  
  // Country Code
  fields['58'] = 'SG'
  
  // Merchant Name (if provided)
  if (merchantName) {
    fields['59'] = merchantName.slice(0, 25) // Max 25 chars
  }
  
  // Merchant City
  fields['60'] = 'Singapore'
  
  // Additional Data Field Template (for reference number)
  if (refNumber) {
    const referenceField = '01' + padLeft(refNumber.length.toString(), 2, '0') + refNumber
    fields['62'] = padLeft(referenceField.length.toString(), 2, '0') + referenceField
  }
  
  // Build the payload
  let payload = ''
  Object.keys(fields).sort().forEach(id => {
    const value = fields[id]

    if (value) {
      payload += id + padLeft(value.length.toString(), 2, '0') + value
    }
  })
  
  // CRC placeholder
  payload += '6304'
  
  // Calculate and append CRC16-CCITT
  const crc = calculateCRC16(payload)
  payload += padLeft(crc.toString(16).toUpperCase(), 4, '0')
  
  // Generate QR code
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

/**
 * Calculate CRC16-CCITT (polynomial 0x1021)
 */
function calculateCRC16(data: string): number {
  const polynomial = 0x1021
  let crc = 0xFFFF
  
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i)
    crc ^= (byte << 8)
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial
      } else {
        crc = crc << 1
      }
      crc &= 0xFFFF
    }
  }
  
  return crc & 0xFFFF
}

/**
 * Pad string with zeros on the left
 */
function padLeft(str: string, length: number, char: string = '0'): string {
  return str.padStart(length, char)
}

/**
 * Validate Singapore phone number (8 or 9 followed by 7 digits)
 */
export function isValidSingaporePhone(phone: string): boolean {
  return /^[89]\d{7}$/.test(phone)
}

/**
 * Validate UEN format
 */
export function isValidUEN(uen: string): boolean {
  // Basic UEN validation - can be enhanced
  return /^[0-9]{8,10}[A-Z]$/.test(uen) || /^[A-Z]{1}[0-9]{8,9}[A-Z]$/.test(uen)
}