import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@kitchencloud/database"
import { phoneNumber } from "./providers/phone-provider"
import { multiUserSchema } from "./providers/multi-user"
import { nanoid } from "nanoid";

// Custom session duration
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql'
  }),
  
  // Multi-user schema for merchants and customers
  userSchema: multiUserSchema,
  
  // Email configuration for merchants
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ( user, url ) => {
      console.log("Password reset link:", url)
      console.log("User: ", user)
      // TODO: Implement with Resend
    },
    sendVerificationEmail: async ( user, url ) => {
      console.log("Verification link:", url)
      console.log("User: ", user)
      // TODO: Implement with Resend
    },
  },
  
  // Custom providers
  providers: [
    phoneNumber({
      sendOTP: async (phoneNumber, code) => {
        console.log(`📱 OTP for ${phoneNumber}: ${code}`)
        // TODO: Implement with Twilio
      },
    }),
  ],
  
  // Session configuration
  session: {
    expiresIn: SESSION_MAX_AGE,
  },
  
  // Security
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    process.env.NEXT_PUBLIC_MERCHANT_URL || "http://localhost:3001",
  ],
  
  // Advanced features
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    generateId: () => {
      return `usr_${nanoid(16)}`
    },
  },
  
  // Hooks for custom logic
  hooks: {
    after: [
      {
        matcher: "/sign-up",
        handler: async ({ user, userType }: { user: any, userType: string }) => {
          if (userType === "merchant") {
            // Create merchant-specific data
            await db.merchant.update({
              where: { id: user.id },
              data: {
                slug: user.businessName
                  ?.toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-") || "",
              },
            })
          }
          
          // Log auth event
          await logAuthEvent({
            userId: user.id,
            userType: userType?.toUpperCase() || "CUSTOMER",
            event: "SIGNUP",
            success: true,
          })
        },
      },
      {
        matcher: "/sign-in",
        handler: async ({ user, userType }: { user: any, userType: string }) => {
          await logAuthEvent({
            userId: user.id,
            userType: userType?.toUpperCase() || "CUSTOMER",
            event: "LOGIN",
            success: true,
          })
        },
      },
    ],
  },
})

// Export types
export type Auth = typeof auth
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>
export type User = NonNullable<Session>["user"]

// Helper functions
async function logAuthEvent(data: {
  userId?: string
  userType: string
  event: string
  success: boolean
  ipAddress?: string
  userAgent?: string
  metadata?: any
}) {
  await db.authEvent.create({ data })
}