import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../../core'
import { phoneSchema } from '../../../utils/validation'

// --- small utils ---
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'merchant'

async function ensureUniqueSlug(db: any, base: string) {
  let slug = base
  for (let i = 1; i < 50; i++) {
    const exists = await db.merchant.findFirst({ where: { slug } })
    if (!exists) return slug
    slug = `${base}-${i + 1}`
  }
  // ultra-rare: fallback to random
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

// Optional header-based token reader for customer session
function readBearerToken(header?: string | null) {
  if (!header) return undefined
  const m = header.match(/^Bearer\s+(.+)$/i)
  return m?.[1]
}

export const authRouter = router({
  /** ---------------- Merchant sign up ---------------- */
  merchantSignUp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      businessName: z.string().min(2).max(100),
      phone: phoneSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // Uniqueness guard (avoid noisy constraint errors)
      const existing = await ctx.db.merchant.findFirst({
        where: { OR: [{ email: input.email }, { phone: input.phone }] },
        select: { id: true, email: true, phone: true }
      })
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email or phone already registered' })
      }

      const { data, error } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { userType: 'merchant' } },
      })
      if (error || !data.user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error?.message || 'Failed to create account',
        })
      }

      // Create unique slug
      const baseSlug = slugify(input.businessName)
      const slug = await ensureUniqueSlug(ctx.db, baseSlug)

      // Hash the password to satisfy schema (not used for auth)
      const bcrypt = await import('bcryptjs')
      const hashed = await bcrypt.hash(input.password, 10)

      const merchant = await ctx.db.merchant.create({
        data: {
          id: data.user.id, // keep aligned with auth user id
          email: input.email,
          phone: input.phone,
          businessName: input.businessName,
          slug,
          password: hashed, // schema requires this
          // leave other fields to defaults
        },
      })

      return { user: data.user, merchant, session: data.session }
    }),

  /** ---------------- Merchant sign in ---------------- */
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
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
      }
      if (data.user.user_metadata?.userType !== 'merchant') {
        // Clean up incompatible session for safety
        await ctx.supabase.auth.signOut().catch(() => {})
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a merchant account' })
      }
      return { user: data.user, session: data.session }
    }),

  /** -------- Customer sign in (OTP MVP) -------- */
  customerSignIn: publicProcedure
    .input(z.object({
      phone: phoneSchema,
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let customer = await ctx.db.customer.findUnique({ where: { phone: input.phone } })
      if (!customer) {
        // Align with schema: id is cuid() by default, but we can also set custom
        customer = await ctx.db.customer.create({
          data: {
            // let DB generate cuid(); storing phone + minimal profile
            phone: input.phone,
            name: input.name || 'Guest',
          },
        })
      }

      // Generate OTP (MVP)
      const otp = Math.floor(100000 + Math.random() * 900000).toString()

      // TODO (production): Store OTP server-side (Redis) with 5-min TTL
      // import { cache } from '@kitchencloud/cache' and: await cache.set(`otp:${customer.id}`, otp, 300)

      // For MVP: return it (remove in prod!)
      return {
        customerId: customer.id,
        otp,
        message: 'OTP sent to your phone',
      }
    }),

  /** ---------------- Verify OTP ---------------- */
  verifyOtp: publicProcedure
    .input(z.object({
      customerId: z.string(),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO (production): verify Redis-stored OTP
      // const stored = await cache.get<string>(`otp:${input.customerId}`)
      // if (!stored || stored !== input.otp) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired OTP' })

      if (!/^\d{6}$/.test(input.otp)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid OTP' })
      }

      const customer = await ctx.db.customer.findUnique({ where: { id: input.customerId } })
      if (!customer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' })
      }

      const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const userAgent = ctx.header('user-agent')
      const ip = ctx.ip

      await ctx.db.session.create({
        data: {
          token: sessionToken,
          customerId: customer.id,
          ipAddress: ip,
          userAgent: userAgent,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30d
        },
      })

      // (Optional) clear OTP in Redis
      // await cache.del(`otp:${input.customerId}`)

      return { customer, sessionToken }
    }),

  /** ---------------- Sign out (merchant or customer) ---------------- */
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    // Supabase sign-out if present
    await ctx.supabase.auth.signOut().catch(() => {})

    // Customer token sign-out (if provided)
    const token = readBearerToken(ctx.header('authorization'))
    if (token) {
      await ctx.db.session.deleteMany({ where: { token } })
    }

    // Best-effort: also clear any sessions tied to the current auth user id
    if (ctx.session?.user?.id) {
      await ctx.db.session.deleteMany({
        where: {
          OR: [{ merchantId: ctx.session.user.id }, { customerId: ctx.session.user.id }],
        },
      })
    }

    return { success: true }
  }),

  /** ---------------- Get current session ---------------- */
  getSession: publicProcedure.query(async ({ ctx }) => {
    // 1) Supabase-backed session (merchant or customer using Supabase)
    if (ctx.session) {
      if (ctx.session.user.userType === 'merchant') {
        const merchant = await ctx.db.merchant.findUnique({ where: { id: ctx.session.user.id } })
        return merchant
          ? { user: ctx.session.user, merchant, type: 'merchant' as const }
          : { user: ctx.session.user, merchant: null, type: 'merchant' as const }
      } else {
        const customer = await ctx.db.customer.findUnique({ where: { id: ctx.session.user.id } })
        return customer
          ? { user: ctx.session.user, customer, type: 'customer' as const }
          : { user: ctx.session.user, customer: null, type: 'customer' as const }
      }
    }

    // 2) Token-backed customer session (Authorization: Bearer <token>)
    const token = readBearerToken(ctx.header('authorization'))
    if (token) {
      const session = await ctx.db.session.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
          customerId: { not: null },
        },
      })
      if (session?.customerId) {
        const customer = await ctx.db.customer.findUnique({ where: { id: session.customerId } })
        if (customer) {
          return {
            user: { id: customer.id, email: customer.email ?? '', userType: 'customer' as const },
            customer,
            type: 'customer_token' as const,
          }
        }
      }
    }

    return null
  }),
})
