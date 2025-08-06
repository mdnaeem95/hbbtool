import { db } from "@kitchencloud/database"

type PhoneProviderOptions = {
  sendOTP: (phoneNumber: string, code: string) => Promise<void>
  otpLength?: number
  otpExpiry?: number // in minutes
}

export function phoneNumber(options: PhoneProviderOptions) {
  const { sendOTP, otpLength = 6, otpExpiry = 10 } = options

  return {
    id: "phone",
    name: "Phone Number",
    
    async sendOTP(phoneNumber: string, type: "SIGNUP" | "LOGIN" = "LOGIN") {
      // Generate OTP
      const code = Array.from({ length: otpLength }, () => 
        Math.floor(Math.random() * 10)
      ).join("")
      
      // Delete existing OTPs
      await db.oTP.deleteMany({
        where: { identifier: phoneNumber },
      })
      
      // Create new OTP
      await db.oTP.create({
        data: {
          identifier: phoneNumber,
          code,
          type,
          expiresAt: new Date(Date.now() + otpExpiry * 60 * 1000),
        },
      })
      
      // Send OTP
      await sendOTP(phoneNumber, code)
      
      return { success: true }
    },
    
    async verifyOTP(phoneNumber: string, code: string) {
      const otp = await db.oTP.findUnique({
        where: {
          identifier_code: {
            identifier: phoneNumber,
            code,
          },
        },
      })
      
      if (!otp) {
        return { success: false, error: "Invalid code" }
      }
      
      if (new Date() > otp.expiresAt) {
        await db.oTP.delete({ where: { id: otp.id } })
        return { success: false, error: "Code expired" }
      }
      
      if (otp.attempts >= 3) {
        await db.oTP.delete({ where: { id: otp.id } })
        return { success: false, error: "Too many attempts" }
      }
      
      // Valid OTP
      await db.oTP.delete({ where: { id: otp.id } })
      
      return { success: true, type: otp.type }
    },
  }
}