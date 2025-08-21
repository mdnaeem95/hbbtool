import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure, protectedProcedure, router } from '../../core'
import { cache } from '@kitchencloud/database'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { slugify } from '../../../utils/slug'

// Validation schemas
const phoneSchema = z.string().regex(/^(\+65)?[689]\d{7}$/, 'Invalid Singapore phone number')
const emailSchema = z.email()
const passwordSchema = z.string().min(8).max(100)

export const authRouter = router({
  // Get current session
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session) return null
    
    return {
      user: ctx.session.user,
      type: ctx.session.user.userType,
    }
  }),

  // Merchant sign up
  merchantSignUp: publicProcedure
    .input(z.object({
      email: emailSchema,
      password: passwordSchema,
      businessName: z.string().min(2).max(100),
      phone: phoneSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if email already exists
      const existingUser = await ctx.db.merchant.findUnique({
        where: { email: input.email },
      })
      
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        })
      }

      // Create Supabase user
      const { data, error } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { userType: 'merchant' },
        },
      })

      if (error || !data.user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to create account',
        })
      }

      // Create merchant record
      const slug = slugify(input.businessName)
      const hashedPassword = await bcrypt.hash(input.password, 10)

      const merchant = await ctx.db.merchant.create({
        data: {
          id: data.user.id, // Use Supabase user ID
          email: input.email,
          phone: input.phone,
          businessName: input.businessName,
          slug,
          password: hashedPassword, // Store for legacy reasons
          status: 'PENDING_VERIFICATION',
        },
      })

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          userType: 'merchant' as const,
        },
        merchant,
      }
    }),

  // Merchant sign in
  merchantSignIn: publicProcedure
    .input(z.object({
      email: emailSchema,
      password: passwordSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      if (error || !data.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Verify it's a merchant account
      if (data.user.user_metadata?.userType !== 'merchant') {
        await ctx.supabase.auth.signOut()
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a merchant account',
        })
      }

      // Get merchant data
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: data.user.id },
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant profile not found',
        })
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          userType: 'merchant' as const,
        },
        merchant,
      }
    }),

  // Customer sign in (request OTP)
  customerSignIn: publicProcedure
    .input(z.object({
      phone: phoneSchema,
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find or create customer
      let customer = await ctx.db.customer.findUnique({
        where: { phone: input.phone },
      })

      if (!customer) {
        customer = await ctx.db.customer.create({
          data: {
            phone: input.phone,
            name: input.name || 'Guest',
            phoneVerified: false,
          },
        })
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()

      // Store OTP in cache (5 minute expiry)
      await cache.set(
        `otp:${customer.id}`,
        { otp, attempts: 0 },
        300 // 5 minutes
      )

      // TODO: Send OTP via SMS/WhatsApp
      // For development, log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP for ${input.phone}: ${otp}`)
      }

      return {
        customerId: customer.id,
        message: 'OTP sent to your phone',
        // Remove this in production!
        ...(process.env.NODE_ENV === 'development' && { otp }),
      }
    }),

  // Verify OTP
  verifyOtp: publicProcedure
    .input(z.object({
      customerId: z.string(),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get stored OTP
      const stored = await cache.get<{ otp: string; attempts: number }>(
        `otp:${input.customerId}`
      )

      if (!stored) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OTP expired or not found',
        })
      }

      // Check attempts
      if (stored.attempts >= 3) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many attempts. Please request a new OTP.',
        })
      }

      // Verify OTP
      if (stored.otp !== input.otp) {
        // Increment attempts
        await cache.set(
          `otp:${input.customerId}`,
          { ...stored, attempts: stored.attempts + 1 },
          300
        )
        
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid OTP',
        })
      }

      // Get customer
      const customer = await ctx.db.customer.findUnique({
        where: { id: input.customerId },
      })

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        })
      }

      // Mark phone as verified
      await ctx.db.customer.update({
        where: { id: customer.id },
        data: { phoneVerified: true },
      })

      // Generate session token
      const sessionToken = `sess_${nanoid(32)}`
      
      // Create session
      await ctx.db.session.create({
        data: {
          token: sessionToken,
          customerId: customer.id,
          ipAddress: ctx.ip,
          userAgent: ctx.req.headers.get('user-agent'),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })

      // Clear OTP
      await cache.del(`otp:${input.customerId}`)

      return {
        customer,
        sessionToken,
      }
    }),

  // Sign out
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Sign out from Supabase
      await ctx.supabase.auth.signOut()
    } catch (error) {
      console.error('Supabase signout error:', error)
    }

    // If customer session, invalidate token
    if (ctx.session.user.userType === 'customer' && ctx.session.token) {
      await ctx.db.session.deleteMany({
        where: { token: ctx.session.token },
      })
    }

    return { success: true }
  }),

  // Refresh session
  refreshSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.userType === 'merchant') {
      // Refresh Supabase session
      const { error } = await ctx.supabase.auth.refreshSession()
      
      if (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Failed to refresh session',
        })
      }

      return { success: true }
    } else {
      // For customers, extend session expiry
      if (ctx.session.token) {
        await ctx.db.session.update({
          where: { token: ctx.session.token },
          data: {
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      }

      return { success: true }
    }
  }),
})