// packages/api/src/utils/paynow.ts
import QRCode from 'qrcode'

/**
 * Generate SGQR-compliant PayNow QR code
 * Based on EMVCo QR Code Specification for Payment Systems
 */
export async function generatePayNowQR(
  phoneOrUEN: string,
  amount: number = 0,
  refNumber?: string,
  merchantName?: string
): Promise<string> {
  const fields: Record<string, string> = {}
  
  // Payload Format Indicator
  fields['00'] = '01'
  
  // Point of Initiation Method (11 = Static, 12 = Dynamic)
  fields['01'] = amount > 0 ? '12' : '11'
  
  // Merchant Account Information (PayNow)
  const isPhone = /^[89]\d{7}$/.test(phoneOrUEN)
  
  // Build the merchant account information
  let accountInfo = ''
  
  if (isPhone) {
    // Mobile number format (Type 0)
    accountInfo = '00' + '02' + '0' // Type 0 for mobile
    accountInfo += '01' + padLeft(('65' + phoneOrUEN).length.toString(), 2, '0') + '65' + phoneOrUEN
  } else {
    // UEN format (Type 2)
    accountInfo = '00' + '02' + '2' // Type 2 for UEN
    accountInfo += '01' + padLeft(phoneOrUEN.length.toString(), 2, '0') + phoneOrUEN
  }
  
  // Add editability (0 = non-editable, 1 = editable)
  const editable = amount === 0 ? '1' : '0'
  accountInfo += '02' + '01' + editable
  
  // Add expiry date (optional - we'll skip for merchant QR codes)
  // accountInfo += '03' + '08' + 'YYYYMMDD'
  
  // Build the full merchant account field
  const paynowData = '00' + '09' + 'SG.PAYNOW' + 
                     '01' + padLeft(accountInfo.length.toString(), 2, '0') + accountInfo
  
  fields['26'] = padLeft(paynowData.length.toString(), 2, '0') + paynowData
  
  // Transaction Currency (SGD = 702)
  fields['53'] = '702'
  
  // Transaction Amount (optional, only if amount > 0)
  if (amount > 0) {
    fields['54'] = amount.toFixed(2)
  }
  
  // Country Code
  fields['58'] = 'SG'
  
  // Merchant Name (max 25 characters)
  if (merchantName) {
    const truncatedName = merchantName.slice(0, 25)
    fields['59'] = truncatedName
  }
  
  // Merchant City
  fields['60'] = 'Singapore'
  
  // Additional Data Field Template (for reference number)
  if (refNumber) {
    const billNumber = '01' + padLeft(refNumber.length.toString(), 2, '0') + refNumber
    fields['62'] = padLeft(billNumber.length.toString(), 2, '0') + billNumber
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
  
  // Generate QR code as base64 data URL
  const qrCodeDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
  
  return qrCodeDataUrl
}

/**
 * Calculate CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF)
 * This is required for SGQR specification compliance
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
 * Pad string with characters on the left
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
 * Singapore UEN formats:
 * - Business: 9 or 10 digits + 1 letter (e.g., 201234567R)
 * - Local company: YYYYNNNNNX (e.g., 202012345A)
 * - Others: T + 2 digits + 2 letters + 4 digits + 1 letter (e.g., T08GB0001A)
 */
export function isValidUEN(uen: string): boolean {
  const patterns = [
    /^[0-9]{9}[A-Z]$/,                    // Old format: 9 digits + 1 letter
    /^[0-9]{10}[A-Z]$/,                   // New format: 10 digits + 1 letter
    /^T[0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/,  // T format
    /^S[0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/,  // S format
    /^R[0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/   // R format
  ]
  
  return patterns.some(pattern => pattern.test(uen))
}