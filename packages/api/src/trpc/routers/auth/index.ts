import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure, protectedProcedure, router } from '../../core'
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
      isMerchant: true,
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

  // Sign out
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Sign out from Supabase
      await ctx.supabase.auth.signOut()
    } catch (error) {
      console.error('Supabase signout error:', error)
    }

    return { success: true }
  }),

  // Refresh session
  refreshSession: protectedProcedure.mutation(async ({ ctx }) => {
    // Refresh Supabase session
    const { error } = await ctx.supabase.auth.refreshSession()
    
    if (error) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Failed to refresh session',
      })
    }

    return { success: true }
  }),
})