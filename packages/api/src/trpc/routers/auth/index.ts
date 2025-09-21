import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure, protectedProcedure, router } from '../../core'
import bcrypt from 'bcryptjs'
import { slugify } from '../../../utils/slug'

// Validation schemas
const phoneSchema = z.string().regex(/^(\+65)?[689]\d{7}$/, 'Invalid Singapore phone number')
const emailSchema = z.email()
const passwordSchema = z.string().min(8).max(100)

// Admin configuration - FIX: Ensure we're using gmail.com
const getAdminEmails = (): string[] => {
  const hardcodedAdmins = ['muhdnaeem95@gmail.com']
  const envAdmins = process.env.ADMIN_EMAILS 
    ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
    : []
  return [...new Set([...hardcodedAdmins, ...envAdmins])]
}

export const authRouter = router({
  // Get current session
  getSession: publicProcedure.query(async ({ ctx }) => {
    // Get session from Supabase
    const { data: { session } } = await ctx.supabase.auth.getSession()
    
    if (!session?.user) return null
    
    // Get merchant by email
    const merchant = await ctx.db.merchant.findFirst({
      where: { 
        email: {
          equals: session.user.email!,
          mode: 'insensitive'
        }
      }
    })

    if (!merchant) return null

    const isAdmin = getAdminEmails().includes(merchant.email.toLowerCase())
    
    return {
      user: {
        id: merchant.id,
        email: merchant.email!,
        userType: 'merchant' as const,
      },
      isMerchant: true,
      isAdmin,
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
      const normalizedEmail = input.email.toLowerCase().trim()
      
      // Check if email already exists in database
      const existingMerchant = await ctx.db.merchant.findUnique({
        where: { email: normalizedEmail },
      })
      
      if (existingMerchant) {
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

      // Hash password for database storage
      const hashedPassword = await bcrypt.hash(input.password, 10)
      
      // Create merchant in database first
      const merchant = await ctx.db.merchant.create({
        data: {
          email: normalizedEmail,
          phone: input.phone,
          businessName: input.businessName,
          slug,
          password: hashedPassword,
          businessType: input.businessType,
          description: input.description,
          websiteUrl: input.website,
          
          // Set status based on admin list
          status: getAdminEmails().includes(normalizedEmail) ? 'ACTIVE' : 'PENDING_VERIFICATION',
          verified: getAdminEmails().includes(normalizedEmail),
          
          // Store signup metadata
          settings: {
            signupIp: ctx.ip || 'unknown',
            signupUserAgent: ctx.req?.headers.get('user-agent') || 'unknown',
            signupDate: new Date().toISOString(),
            pendingApproval: !getAdminEmails().includes(normalizedEmail),
          }
        },
      })

      // Use regular Supabase signup (not admin API)
      const { data: authData, error: authError } = await ctx.supabase.auth.signUp({
        email: normalizedEmail,
        password: input.password,
        options: {
          data: {
            businessName: input.businessName,
            userType: 'merchant',
            merchantId: merchant.id,
          },
          // Don't send confirmation email - we'll handle approval manually
          emailRedirectTo: undefined,
        }
      })

      if (authError) {
        console.error('Supabase signup failed:', authError)
        console.log('Failed for: ', authData)
        // Clean up merchant record if Supabase fails
        await ctx.db.merchant.delete({ where: { id: merchant.id } })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: authError.message || 'Failed to create account. Please try again.',
        })
      }

      console.log(`New merchant signup: ${merchant.businessName} (${merchant.email}) - Status: ${merchant.status}`)

      return {
        success: true,
        message: merchant.status === 'ACTIVE' 
          ? 'Account created successfully!'
          : 'Application submitted successfully. You will receive an email once approved.',
      }
    }),

  // Merchant sign in
  merchantSignIn: publicProcedure
    .input(z.object({
      email: emailSchema,
      password: passwordSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.toLowerCase().trim()
      
      console.log('Login attempt for:', normalizedEmail)
      
      // First check if merchant exists in our database
      const merchant = await ctx.db.merchant.findFirst({
        where: { 
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        }
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      console.log(`Merchant found: ${merchant.businessName} - Status: ${merchant.status}`)

      // Check merchant status BEFORE attempting authentication
      if (merchant.status === 'PENDING_VERIFICATION') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your account is pending approval. You will receive an email once approved.',
        })
      }

      if (merchant.status === 'SUSPENDED') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: merchant.suspensionReason || 'Your account has been suspended. Please contact support.',
        })
      }

      if (merchant.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your account is not active. Please contact support.',
        })
      }

      if (!merchant.verified) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please verify your email address to continue.',
        })
      }

      // Now authenticate with Supabase
      const { data: authData, error: authError } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      if (authError || !authData.user) {
        console.log('Authentication failed:', authError?.message)
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Check if user is admin
      const adminEmails = getAdminEmails()
      const isAdmin: boolean = adminEmails.includes(normalizedEmail)
      
      console.log('🔍 Admin check:')
      console.log('  - User email:', normalizedEmail)
      console.log('  - Admin emails:', adminEmails)
      console.log('  - Is admin?:', isAdmin)
      
      console.log(`Login successful: ${merchant.businessName} (Admin: ${isAdmin})`)

      return {
        user: {
          id: merchant.id,
          email: merchant.email!,
          userType: 'merchant' as const,
        },
        merchant,
        isAdmin,
      }
    }),

  // Sign out
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      // Don't throw, just log - user wants to sign out regardless
    }

    return { success: true }
  }),

  // Refresh session
  refreshSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.auth.refreshSession()
    
    if (error) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Session expired. Please sign in again.',
      })
    }

    if (!data.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No active session found.',
      })
    }

    return { 
      success: true,
    }
  }),
})