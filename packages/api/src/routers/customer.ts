import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import bcrypt from "bcryptjs"

export const customerRouter = createTRPCRouter({
  // Get customer profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "CUSTOMER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only customers can access this",
      })
    }

    const customer = await ctx.db.customer.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        addresses: {
          orderBy: { isDefault: "desc" },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
    })

    if (!customer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer not found",
      })
    }

    return customer
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can access this",
        })
      }

      const updated = await ctx.db.customer.update({
        where: { id: ctx.session.user.id },
        data: input,
      })

      return updated
    }),

  // Change password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can access this",
        })
      }

      const customer = await ctx.db.customer.findUnique({
        where: { id: ctx.session.user.id },
      })

      if (!customer || !customer.password) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        })
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        input.currentPassword,
        customer.password
      )

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        })
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10)

      await ctx.db.customer.update({
        where: { id: ctx.session.user.id },
        data: { password: hashedPassword },
      })

      return { success: true }
    }),

  // Address management
  listAddresses: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "CUSTOMER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only customers can access this",
      })
    }

    const addresses = await ctx.db.address.findMany({
      where: { customerId: ctx.session.user.id },
      orderBy: { isDefault: "desc" },
    })

    return addresses
  }),

  createAddress: protectedProcedure
    .input(
      z.object({
        label: z.string(),
        line1: z.string(),
        line2: z.string().optional(),
        postalCode: z.string(),
        instructions: z.string().optional(),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can access this",
        })
      }

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await ctx.db.address.updateMany({
          where: { customerId: ctx.session.user.id },
          data: { isDefault: false },
        })
      }

      const address = await ctx.db.address.create({
        data: {
          ...input,
          customerId: ctx.session.user.id,
        },
      })

      return address
    }),

  updateAddress: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        line1: z.string().optional(),
        line2: z.string().optional(),
        postalCode: z.string().optional(),
        instructions: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify ownership
      const address = await ctx.db.address.findFirst({
        where: {
          id,
          customerId: ctx.session.user.id,
        },
      })

      if (!address) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        })
      }

      // If setting as default, unset other defaults
      if (data.isDefault) {
        await ctx.db.address.updateMany({
          where: {
            customerId: ctx.session.user.id,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }

      const updated = await ctx.db.address.update({
        where: { id },
        data,
      })

      return updated
    }),

  deleteAddress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const address = await ctx.db.address.findFirst({
        where: {
          id: input.id,
          customerId: ctx.session.user.id,
        },
      })

      if (!address) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        })
      }

      await ctx.db.address.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get order history
  getOrderHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can access this",
        })
      }

      const orders = await ctx.db.order.findMany({
        where: { customerId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          merchant: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      let nextCursor: typeof input.cursor | undefined = undefined
      if (orders.length > input.limit) {
        const nextItem = orders.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: orders,
        nextCursor,
      }
    }),
})