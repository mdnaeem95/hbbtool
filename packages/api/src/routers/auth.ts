import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"

function toSlug(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

// basic phone normalizer; swap with libphonenumber-js if needed
function normalizePhone(p: string) {
  return p.replace(/\D/g, "")
}

export const authRouter = createTRPCRouter({
  // Get current session
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session
  }),

  // Sign up as customer
  signUpCustomer: publicProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        password: z.string().min(8).optional(),
        name: z.string().min(1),
        phone: z.string(),
        // if true => require password
        createAccount: z.boolean().default(false),
        //optional address capture on signup
        address: z
            .object({
                label: z.string().default("Home"),
                line1: z.string().min(1),
                line2: z.string().optional(),
                postalCode: z.string().min(3),
                latitude: z.number().optional(),
                longitude: z.number().optional(),
                isDefault: z.boolean().default(true),                
            })
            .optional(),
        marketingOptIn: z.boolean().optional(),
      })
      .refine(
        (v) => (v.createAccount ? !!v.password : true),
        { path: ["password"], message: "Password is required to create an account" }
      )
    )
    .mutation(async ({ ctx, input }) => {
      const phone = normalizePhone(input.phone)
      const email = input.email?.toLowerCase().trim()
      const { name, createAccount, marketingOptIn } = input

      // look for existing by phone/email 
      const [byPhone, byEmail] = await Promise.all([
        ctx.db.customer.findUnique({ where: { phone } }),
        email ? ctx.db.customer.findUnique({ where: { email } }) : Promise.resolve(null),
      ])

      // Conflict check when both exist but are different customers
      if (byPhone && byEmail && byPhone.id !== byEmail.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Phone and email belong to different customer accounts. Contact support.",
        })
      }

      // Pick existing record if any
      const existing = byPhone ?? byEmail

      // Hash password
      const hashedPassword = createAccount && input.password ? await bcrypt.hash(input.password, 10) : undefined

      // Upsert inside a transaction (so address + counters are consistent)
      const result = await ctx.db.$transaction(async (tx) => {
        let customer =
          existing
            ? await tx.customer.update({
                where: { id: existing.id },
                data: {
                  // keep email if already set; otherwise set provided one
                  email: existing.email ?? email,
                  phone, // normalized
                  name,
                  // if upgrading guest -> add password
                  ...(createAccount && !existing.password && hashedPassword
                    ? { password: hashedPassword }
                    : {}),
                  // don’t silently override a previously set password
                  ...(marketingOptIn !== undefined ? { marketingOptIn } : {}),
                },
                select: {
                  id: true, email: true, phone: true, name: true,
                  password: true, emailVerified: true, phoneVerified: true,
                  totalOrders: true, createdAt: true, updatedAt: true,
                },
              })
            : await tx.customer.create({
                data: {
                  email, phone, name,
                  ...(createAccount && hashedPassword ? { password: hashedPassword } : {}),
                  ...(marketingOptIn !== undefined ? { marketingOptIn } : {}),
                },
                select: {
                  id: true, email: true, phone: true, name: true,
                  password: true, emailVerified: true, phoneVerified: true,
                  totalOrders: true, createdAt: true, updatedAt: true,
                },
              })

        // Optionally create address
        if (input.address) {
          await tx.address.create({
            data: {
              customerId: customer.id,
              label: input.address.label ?? "Home",
              line1: input.address.line1,
              line2: input.address.line2,
              postalCode: input.address.postalCode,
              latitude: input.address.latitude,
              longitude: input.address.longitude,
              isDefault: input.address.isDefault ?? true,
            },
          })
        }

        // Optionally create a session for accounts
        let sessionToken: string | undefined
        if (createAccount) {
          sessionToken = nanoid(48)
          await tx.session.create({
            data: {
              token: sessionToken,
              customerId: customer.id,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30d
              // ipAddress / userAgent: pass via ctx if you track them
            },
          })
        }

      return { customer, sessionToken }
    })

    const { customer, sessionToken } = result

    // If user tried to create account but an existing account already had a password, block it
        if (createAccount && existing?.password) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "An account already exists for this customer. Please sign in.",
        })
    }

    return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: "CUSTOMER" as const,
        // expose session token only if we created one
        ...(sessionToken ? { sessionToken, sessionExpiresInDays: 30 } : {}),
    }
    }),

  // Sign up as merchant
  signUpMerchant: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
        businessName: z.string().min(1),
        phone: z.string(),
        address: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // guard by email and phone
      const [emailExists, phoneExists] = await Promise.all([
        ctx.db.merchant.findUnique({ where: { email: input.email } }),
        ctx.db.merchant.findUnique({ where: { phone: input.phone } }),
      ])

      if (emailExists || phoneExists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: emailExists ? "Email already exists" : "Phone already exists",
        })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10)

      // create with unique slug
      const baseSlug = toSlug(input.businessName) || "merchant"
      let slug = baseSlug

      for (let i = 0; i < 3; i++) {
        try {
            const merchant = await ctx.db.merchant.create({
            data: {
                email: input.email,
                phone: input.phone,
                password: hashedPassword,
                businessName: input.businessName,
                slug,
                address: input.address,
            },
            select: {
                id: true,
                email: true,
                phone: true,
                businessName: true,
                slug: true,
                status: true,
                verified: true,
                createdAt: true,
            },
        })

        return {
            ...merchant,
            role: "MERCHANT" as const
        }
      } catch (err: any) {
        // prisma unique constraint error
        if (err?.code === "P2002" && Array.isArray(err?.meta?.target)) {
            // if slug collided, bump and retry; otherwise rethrow
            if (err.meta.target.includes("slug")) {
                slug = `${baseSlug}-${Math.floor(Math.random() * 1e6)
                    .toString()
                    .padStart(6, "0")}`
                continue
            }
        }
        throw err
      }
    }

    throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not allocate a unique slug. Please try again."
    })
    }),

  // Sign in
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
        userType: z.enum(["customer", "merchant"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, password, userType } = input

      if (userType === "customer") {
        // email is unique but nullable on customer
        const customer = await ctx.db.customer.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, password: true }
        })

        const hasPassword = !!customer?.password
        const isValid = hasPassword && (await bcrypt.compare(password, customer.password!))

        if (!customer || !isValid) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid email or password"
            })
        }

        return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            role: "CUSTOMER" as const,
        }
      } else {
        // merchant path
        const merchant = await ctx.db.merchant.findUnique({
          where: { email },
          select: { id: true, email: true, businessName: true, password: true },
        })

        const isValid = !!merchant && (await bcrypt.compare(password, merchant.password))

        if (!merchant || !isValid) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid email or password"
            })
        }

        return {
            id: merchant.id,
            email: merchant.email,
            name: merchant.businessName,
            role: "MERCHANT" as const, 
        }
      }
    }),

  // Sign out
  signOut: protectedProcedure.mutation(async () => {
    // In real app, destroy session
    return { success: true }
  }),
})