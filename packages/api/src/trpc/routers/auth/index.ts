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
      email: z.string().email(),
      password: z.string().min(8),
      businessName: z.string().min(2).max(100),
      phone: phoneSchema,
      businessType: z.string().optional(),
      description: z.string().max(500).optional(),
      website: z.string().optional(),
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

      // Anti-spam: Check recent signups from same IP
      if (ctx.ip) {
        const recentSignups = await ctx.db.merchant.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            settings: {
              path: ['signupIp'],
              equals: ctx.ip
            }
          }
        })
        
        if (recentSignups >= 3) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many signup attempts. Please try again later.',
          })
        }
      }

      // Create unique slug
      const baseSlug = slugify(input.businessName)
      let slug = baseSlug
      let counter = 1
      
      while (await ctx.db.merchant.findFirst({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      const hashedPassword = await bcrypt.hash(input.password, 10)

      // Create merchant with PENDING_VERIFICATION status
      const merchant = await ctx.db.merchant.create({
        data: {
          email: input.email,
          phone: input.phone,
          businessName: input.businessName,
          slug,
          password: hashedPassword,
          businessType: input.businessType,
          description: input.description,
          websiteUrl: input.website,
          
          // Use existing fields
          status: 'PENDING_VERIFICATION',  // Already in your schema!
          verified: false,                  // Already in your schema!
          
          // Store signup metadata in settings field
          settings: {
            signupIp: ctx.ip,
            signupUserAgent: ctx.req.headers.get('user-agent'),
            signupDate: new Date().toISOString(),
            pendingApproval: true,
          }
        },
      })

      // Send notification emails (implement based on your email service)
      console.log(`📧 New signup: ${merchant.businessName} (${merchant.email})`)
      console.log(`⏳ Status: PENDING_VERIFICATION`)
      
      // In production, send actual emails here
      // await sendAdminNotification(merchant)
      // await sendMerchantConfirmation(merchant)

      return {
        success: true,
        message: 'Application submitted successfully'
      }
    }),

  // Merchant sign in
  merchantSignIn: publicProcedure
    .input(z.object({
      email: emailSchema,
      password: passwordSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // FIRST: Check merchant status in database
      console.log('🔍 Login attempt for:', input.email)
      const merchant = await ctx.db.merchant.findUnique({
        where: { email: input.email },
      })

      console.log('📦 Merchant found:', merchant ? 'YES' : 'NO')
      console.log('📦 Merchant status:', merchant?.status)
      console.log('📦 Merchant verified:', merchant?.verified)

      if (!merchant) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // CHECK STATUS BEFORE TRYING SUPABASE
      if (merchant.status === 'PENDING_VERIFICATION') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your account is pending approval. You will receive an email once approved.',
        })
      }

      if (merchant.status === 'SUSPENDED') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: merchant.suspensionReason || 'Your account has been suspended.',
        })
      }

      if (merchant.status !== 'ACTIVE' || !merchant.verified) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your account is not active.',
        })
      }

      // NOW TRY SUPABASE (only for active merchants)
      console.log('🔐 Attempting Supabase auth...')
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      console.log('🔐 Supabase result:', error ? `ERROR: ${error.message}` : 'SUCCESS')

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