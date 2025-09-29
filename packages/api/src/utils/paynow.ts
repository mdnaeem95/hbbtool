// packages/api/src/utils/paynow.ts
import QRCode from 'qrcode'

/**
 * Generate SGQR-compliant PayNow QR code
 * Based on EMVCo QR Code Specification and Singapore PayNow standards
 */
export async function generatePayNowQR(
  phoneOrUEN: string,
  amount: number = 0,
  refNumber?: string,
  merchantName?: string,
  expiryDate?: string
): Promise<string> {
  // Determine if it's a phone number or UEN
  const isPhone = /^[89]\d{7}$/.test(phoneOrUEN)
  
  // Format the identifier correctly
  let identifier = phoneOrUEN
  if (isPhone) {
    // Add +65 prefix for phone numbers
    identifier = '+65' + phoneOrUEN
  }
  
  // Build the payload fields
  const fields: Array<{ id: string; value: string | Array<{ id: string; value: string }> }> = [
    { id: '00', value: '01' }, // Payload Format Indicator
    { id: '01', value: amount > 0 ? '12' : '11' }, // Point of Initiation Method (11=static, 12=dynamic)
    { 
      id: '26', // Merchant Account Info Template
      value: [
        { id: '00', value: 'SG.PAYNOW' },
        { id: '01', value: isPhone ? '0' : '2' }, // 0 for mobile, 2 for UEN
        { id: '02', value: identifier }, // PayNow identifier (phone with +65 or UEN)
        { id: '03', value: amount === 0 ? '1' : '0' }, // 1 = editable amount, 0 = fixed amount
        { id: '04', value: expiryDate || formatExpiryDate(7) } // Default to 7 days from now
      ]
    },
    { id: '52', value: '0000' }, // Merchant Category Code (not used)
    { id: '53', value: '702' }, // Currency Code (SGD = 702)
  ]
  
  // Add amount if specified
  if (amount > 0) {
    fields.push({ id: '54', value: amount.toFixed(2) })
  }
  
  // Add country and merchant info
  fields.push(
    { id: '58', value: 'SG' }, // Country Code
    { id: '59', value: (merchantName || 'MERCHANT').slice(0, 25) }, // Merchant Name (max 25 chars)
    { id: '60', value: 'Singapore' } // Merchant City
  )
  
  // Add reference number if provided
  if (refNumber) {
    fields.push({
      id: '62',
      value: [{ id: '01', value: refNumber }] // Bill/Reference Number
    })
  }
  
  // Build the payload string
  let payload = fields.reduce((final, current) => {
    let value = current.value
    if (Array.isArray(value)) {
      // Handle nested fields
      value = value.reduce((f, c) => {
        return f + c.id + padLeft(c.value.length.toString(), 2) + c.value
      }, '')
    }
    return final + current.id + padLeft(value.length.toString(), 2) + value
  }, '')
  
  // Add CRC placeholder
  payload += '6304'
  
  // Calculate and append CRC16
  const crc = calculateCRC16(payload)
  payload += crc
  
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
 * Calculate CRC16-CCITT for PayNow QR
 * Uses polynomial 0x1021 with initial value 0xFFFF
 */
function calculateCRC16(data: string): string {
  const crcTable = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
    0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
    0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
    0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
    0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
    0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
    0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
    0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
    0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
    0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
    0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
    0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
    0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
    0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
    0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
    0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
    0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
    0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
    0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
    0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
    0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
    0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
    0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
    0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
    0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
    0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
    0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
    0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
  ]
  
  let crc = 0xFFFF
  
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i)
    if (c > 255) {
      throw new RangeError('Character out of range')
    }
    const j = (c ^ (crc >> 8)) & 0xFF
    crc = crcTable[j]! ^ (crc << 8)
  }
  
  // Return as 4-character uppercase hex string
  return ((crc ^ 0) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Pad string with zeros on the left
 */
function padLeft(str: string, length: number, char: string = '0'): string {
  return str.padStart(length, char)
}

/**
 * Format expiry date to YYYYMMDD or YYYYMMDDHHmmss format
 * @param daysFromNow Number of days from now for expiry
 */
function formatExpiryDate(daysFromNow: number = 7): string {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + daysFromNow)
  
  const year = expiryDate.getFullYear()
  const month = String(expiryDate.getMonth() + 1).padStart(2, '0')
  const day = String(expiryDate.getDate()).padStart(2, '0')
  
  return `${year}${month}${day}`
}

/**
 * Format expiry date with time
 */
export function formatExpiryDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`
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
  const patterns = [
    /^[0-9]{9}[A-Z]$/,                    // Old format: 9 digits + 1 letter
    /^[0-9]{10}[A-Z]$/,                   // New format: 10 digits + 1 letter  
    /^T[0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/,  // T format
    /^S[0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/,  // S format
    /^R[0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/   // R format
  ]
  
  return patterns.some(pattern => pattern.test(uen))
}