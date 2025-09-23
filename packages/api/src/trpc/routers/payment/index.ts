import { z } from 'zod'
import { router, publicProcedure, merchantProcedure, protectedProcedure } from '../../core'
import { TRPCError } from '@trpc/server'
import { PaymentMethod } from '@homejiak/database'
import { generatePayNowQR } from '../../../utils/paynow'

export const paymentRouter = router({
  uploadProof: publicProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      proofUrl: z.string().url(),
      transactionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First, check if order exists
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: { payment: true }
      })
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found'
        })
      }
      
      // If no payment record exists, create one
      if (!order.payment) {
        await ctx.db.payment.create({
          data: {
            orderId: input.orderId,
            method: order.paymentMethod || 'PAYNOW',
            status: 'PROCESSING',
            amount: order.total,
            currency: 'SGD',
            transactionId: input.transactionId,
          }
        })
      } else {
        // Update existing payment
        await ctx.db.payment.update({
          where: { orderId: input.orderId },
          data: {
            transactionId: input.transactionId,
            status: 'PROCESSING',
            updatedAt: new Date()
          }
        })
      }
      
      // Update order with payment proof
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentProof: input.proofUrl,
          paymentStatus: 'PROCESSING',
        }
      })
      
      return { success: true }
    }),

  // 2) Poll payment status (public)
  getStatus: publicProcedure
    .input(z.object({ orderId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          paymentStatus: true,
          paymentMethod: true,
          paymentConfirmedAt: true,
          total: true,
        },
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
      }

      const payment = await ctx.db.payment.findFirst({
        where: { orderId: input.orderId },
        orderBy: { createdAt: 'desc' },
      })

      return {
        status: order.paymentStatus,
        method: (payment?.method ?? order.paymentMethod) ?? null,
        amount: payment?.amount ? payment.amount.toNumber() : order.total.toNumber(),
        paidAt: order.paymentConfirmedAt ?? null,
        paymentId: payment?.id ?? null,
      }
    }),

  // 3) Merchant verifies payment manually
  verifyPayment: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      amount: z.number(),
      transactionId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Update existing verifyPayment to also update order status
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paymentConfirmedAt: new Date(),
          paymentConfirmedBy: ctx.session.user.id,
          confirmedAt: new Date(),
          payment: {
            update: {
              status: 'COMPLETED',
              processedAt: new Date(),
              transactionId: input.transactionId,
              amount: input.amount
            }
          }
        }
      })
      
      return { success: true }
    }),

  // 4) Merchant rejects payment
  rejectPayment: merchantProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      reason: z.string().min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, merchantId: ctx.session.user.id },
        select: { id: true, status: true },
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
      }

      const payment = await ctx.db.payment.findFirst({
        where: { orderId: input.orderId },
        orderBy: { createdAt: 'desc' },
      })

      if (payment) {
        await ctx.db.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        })
      }

      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          notes: `Payment rejected: ${input.reason}`,
        },
      })

      await ctx.db.orderEvent.create({
        data: {
          orderId: input.orderId,
          event: 'payment_rejected',
          data: { reason: input.reason, paymentId: payment?.id },
        },
      })

      return { success: true }
    }),

  // 5) Expose merchant’s enabled payment methods (PayNow)
  getMerchantMethods: publicProcedure
    .input(z.object({ merchantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
        select: { paynowNumber: true, paynowQrCode: true },
      })

      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      const methods: Array<{
        method: PaymentMethod
        enabled: boolean
        details?: { number?: string | null; qrCode?: string | null }
      }> = []

      if (merchant.paynowNumber) {
        methods.push({
          method: 'PAYNOW',
          enabled: true,
          details: {
            number: merchant.paynowNumber,
            qrCode: merchant.paynowQrCode,
          },
        })
      }

      return methods
    }),

  generateQR: protectedProcedure
    .input(z.object({
      orderId: z.string().optional(),
      paynowNumber: z.string().optional(),
      amount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: ctx.session.user.id },
        select: { 
          paynowNumber: true, 
          businessName: true 
        }
      })
      
      if (!merchant?.paynowNumber) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'PayNow number not configured' 
        })
      }
      
      const qrCode = await generatePayNowQR(
        merchant.paynowNumber,
        input.amount || 0,
        input.orderId,
        merchant.businessName
      )
      
      return { qrCode }
    }),

  getPendingPayments: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.order.findMany({
        where: {
          merchantId: ctx.session!.user.id,
          paymentStatus: 'PROCESSING',
          paymentProof: { not: null }
        },
        include: {
          customer: true,
          items: { include: { product: true }},
          payment: true,
        },
        orderBy: { createdAt: 'desc' }
      })
    })
})