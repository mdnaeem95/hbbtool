import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../../trpc'
import { TRPCError } from '@trpc/server'
import { PaymentMethod, PaymentStatus } from '@kitchencloud/database'

export const paymentRouter = router({
  // Upload payment proof
  uploadProof: publicProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      fileUrl: z.string().url(),
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify order exists
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          paymentStatus: true,
          merchantId: true,
        },
      })
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        })
      }
      
      // Create payment record
      const payment = await ctx.db.payment.create({
        data: {
          orderId: input.orderId,
          method: 'PAYNOW' as PaymentMethod,
          status: 'PENDING' as PaymentStatus,
          amount: 0, // Will be updated when payment is verified
        },
      })
      
      // Update order payment status
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: 'PENDING',
        },
      })
      
      return payment
    }),
    
  // Get payment status
  getStatus: publicProcedure
    .input(z.object({
      orderId: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findFirst({
        where: { orderId: input.orderId },
        orderBy: { createdAt: 'desc' },
      })
      
      if (!payment) {
        return {
          status: 'PENDING' as PaymentStatus,
          method: null,
          amount: null,
          paidAt: null,
        }
      }
      
      return {
        status: payment.status,
        method: payment.method,
        amount: payment.amount.toNumber(),
        paidAt: payment.paidAt,
      }
    }),
    
  // Verify payment (merchant only)
  verifyPayment: protectedProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      amount: z.number().positive(),
      transactionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify merchant owns the order
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          merchantId: ctx.session?.user.id,
        },
      })
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        })
      }
      
      // Update payment record
      const payment = await ctx.db.payment.findFirst({
        where: { orderId: input.orderId },
        orderBy: { createdAt: 'desc' },
      })
      
      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment record not found',
        })
      }
      
      // Update payment
      await ctx.db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          amount: input.amount,
          transactionId: input.transactionId,
          paidAt: new Date(),
        },
      })
      
      // Update order
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
        },
      })
      
      // TODO: Send confirmation notification
      
      return { success: true }
    }),
    
  // Reject payment (merchant only)
  rejectPayment: protectedProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify merchant owns the order
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          merchantId: ctx.session?.user.id,
        },
      })
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        })
      }
      
      // Update payment record
      const payment = await ctx.db.payment.findFirst({
        where: { orderId: input.orderId },
        orderBy: { createdAt: 'desc' },
      })
      
      if (payment) {
        await ctx.db.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
          },
        })
      }
      
      // Update order
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          notes: `Payment rejected: ${input.reason}`,
        },
      })
      
      // TODO: Send notification to customer
      
      return { success: true }
    }),
    
  // Get payment methods for merchant
  getMerchantMethods: publicProcedure
    .input(z.object({
      merchantId: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
        select: {
          paynowNumber: true,
          paynowQrCode: true,
        },
      })
      
      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found',
        })
      }
      
      const methods = []
      
      if (merchant.paynowNumber) {
        methods.push({
          method: 'PAYNOW' as PaymentMethod,
          enabled: true,
          details: {
            number: merchant.paynowNumber,
            qrCode: merchant.paynowQrCode,
          },
        })
      }
         
      return methods
    }),
})