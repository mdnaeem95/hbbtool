import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../../trpc'
import { TRPCError } from '@trpc/server'
import { phoneSchema } from '../../utils/validation'

export const authRouter = router({
  // Merchant sign up
  merchantSignUp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      businessName: z.string().min(2).max(100),
      phone: phoneSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Create auth user with Supabase
        const { data, error } = await ctx.supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              userType: 'merchant',
            },
          },
        })
        
        if (error || !data.user) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error?.message || 'Failed to create account',
          })
        }
        
        // Create merchant profile
        const merchant = await ctx.db.merchant.create({
          data: {
            id: data.user.id,
            email: input.email,
            phone: input.phone,
            businessName: input.businessName,
            slug: input.businessName.toLowerCase().replace(/\s+/g, '-'),
          },
        })
        
        return { user: data.user, merchant, session: data.session }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create account',
        })
      }
    }),
    
  // Merchant sign in
  merchantSignIn: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
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
      
      // Verify user is a merchant
      if (data.user.user_metadata?.userType !== 'merchant') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a merchant account',
        })
      }
      
      return { user: data.user, session: data.session }
    }),
    
  // Customer sign in (phone-based)
  customerSignIn: publicProcedure
    .input(z.object({
      phone: phoneSchema,
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if customer exists
      let customer = await ctx.db.customer.findUnique({
        where: { phone: input.phone },
      })
      
      // Create customer if new
      if (!customer) {
        // Generate a unique ID for the customer
        const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        customer = await ctx.db.customer.create({
          data: {
            id: customerId,
            phone: input.phone,
            name: input.name || 'Guest',
          },
        })
      }
      
      // For MVP, we'll use a simple OTP system
      // In production, integrate with SMS provider
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      // TODO: Store OTP in Redis with expiry
      // await ctx.redis.setex(`otp:${customer.id}`, 300, otp) // 5 min expiry
      
      // For now, return it (remove in production!)
      return { 
        customerId: customer.id,
        otp, // Remove this in production
        message: 'OTP sent to your phone' 
      }
    }),
    
  // Verify OTP
  verifyOtp: publicProcedure
    .input(z.object({
      customerId: z.string(),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Verify OTP from Redis
      // const storedOtp = await ctx.redis.get(`otp:${input.customerId}`)
      
      // For MVP, accept any 6-digit OTP
      if (!/^\d{6}$/.test(input.otp)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
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
      
      // Create session token
      const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store session
      await ctx.db.session.create({
        data: {
          token: sessionToken,
          customerId: customer.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })
      
      return { 
        customer,
        sessionToken,
      }
    }),
    
  // Sign out
  signOut: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.supabase.auth.signOut()
      
      // If there's a session token, invalidate it
      if (ctx.session) {
        await ctx.db.session.deleteMany({
          where: {
            OR: [
              { merchantId: ctx.session.user.id },
              { customerId: ctx.session.user.id },
            ],
          },
        })
      }
      
      return { success: true }
    }),
    
  // Get current session
  getSession: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session) {
        return null
      }
      
      if (ctx.session.user.userType === 'merchant') {
        const merchant = await ctx.db.merchant.findUnique({
          where: { id: ctx.session.user.id },
        })
        
        return {
          user: ctx.session.user,
          merchant,
          type: 'merchant',
        }
      } else {
        const customer = await ctx.db.customer.findUnique({
          where: { id: ctx.session.user.id },
        })
        
        return {
          user: ctx.session.user,
          customer,
          type: 'customer',
        }
      }
    }),
})