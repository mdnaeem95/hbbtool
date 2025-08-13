export function validatePassword(password: string): { 
  isValid: boolean
  errors: string[] 
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validatePhoneNumber(phone: string): boolean {
  // Singapore phone number format
  const phoneRegex = /^(\+65)?[689]\d{7}$/
  const cleanPhone = phone.replace(/[\s-]/g, '')
  return phoneRegex.test(cleanPhone)
}

export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s-]/g, '')
  if (cleanPhone.startsWith('+65')) {
    return cleanPhone
  }
  return `+65${cleanPhone}`
}