import QRCode from 'qrcode'

export async function generatePayNowQR(
  phoneOrUEN: string,
  amount: number,
  refNumber?: string
): Promise<string> {
  // Simple PayNow string generation
  const isPhone = /^\d+$/.test(phoneOrUEN)
  let payNowString = '00020101021126460009SG.PAYNOW'
  
  if (isPhone) {
    const phone = `+65${phoneOrUEN}`
    payNowString += `010120${phone.length.toString().padStart(2, '0')}${phone}`
  } else {
    payNowString += `020${phoneOrUEN.length.toString().padStart(2, '0')}${phoneOrUEN}`
  }
  
  payNowString += '0301' + '0' // Not editable
  
  // Add amount
  if (amount > 0) {
    const amountStr = amount.toFixed(2)
    payNowString += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`
  }
  
  // Add reference if provided
  if (refNumber) {
    const refField = `01${refNumber.length.toString().padStart(2, '0')}${refNumber}`
    payNowString += `62${refField.length.toString().padStart(2, '0')}${refField}`
  }
  
  payNowString += '5802SG5303702' // Country and currency
  payNowString += '6304' // CRC placeholder
  
  // Simple CRC calculation (simplified version)
  const crc = calculateCRC(payNowString)
  payNowString += crc.toString(16).toUpperCase().padStart(4, '0')
  
  return await QRCode.toDataURL(payNowString, {
    width: 300,
    margin: 2
  })
}

function calculateCRC(data: string): number {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
    }
  }
  return crc & 0xFFFF
}