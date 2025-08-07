/**
 * Validates a password against security requirements
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  // Optional: Check for special character
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push("Password must contain at least one special character")
  // }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Generates a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  const allChars = uppercase + lowercase + numbers + special
  
  let password = ''
  
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Checks password strength and returns a score
 */
export function getPasswordStrength(password: string): {
  score: number // 0-4
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  feedback: string[]
} {
  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length < 8) {
    feedback.push("Use at least 8 characters")
  }

  // Character variety
  if (/[a-z]/.test(password)) score += 0.5
  if (/[A-Z]/.test(password)) score += 0.5
  if (/[0-9]/.test(password)) score += 0.5
  if (/[^A-Za-z0-9]/.test(password)) score += 0.5

  // Pattern checks
  if (/(.)\1{2,}/.test(password)) {
    score -= 0.5
    feedback.push("Avoid repeating characters")
  }

  // Common patterns
  const commonPatterns = [
    /^[0-9]+$/, // Only numbers
    /^[a-zA-Z]+$/, // Only letters
    /^(.)\1+$/, // Same character repeated
    /^(123|234|345|456|567|678|789|890|321|432|543|654|765|876|987|098)/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential letters
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 1
      feedback.push("Avoid common patterns")
      break
    }
  }

  // Cap the score
  score = Math.max(0, Math.min(4, Math.round(score)))

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  if (score === 0) strength = 'weak'
  else if (score === 1) strength = 'fair'
  else if (score === 2) strength = 'good'
  else if (score === 3) strength = 'strong'
  else strength = 'very-strong'

  // Add feedback based on missing elements
  if (!/[A-Z]/.test(password)) feedback.push("Add uppercase letters")
  if (!/[a-z]/.test(password)) feedback.push("Add lowercase letters")
  if (!/[0-9]/.test(password)) feedback.push("Add numbers")
  if (!/[^A-Za-z0-9]/.test(password)) feedback.push("Add special characters")

  return { score, strength, feedback }
}

/**
 * Masks a password for display (e.g., in logs)
 */
export function maskPassword(password: string): string {
  if (!password || password.length === 0) return ''
  if (password.length <= 3) return '*'.repeat(password.length)
  
  const firstChar = password[0]
  const lastChar = password[password.length - 1]
  const middleLength = password.length - 2
  
  return `${firstChar}${'*'.repeat(middleLength)}${lastChar}`
}