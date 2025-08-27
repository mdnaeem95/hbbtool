import { z } from 'zod'
import { router, publicProcedure, merchantProcedure, protectedProcedure } from '../../core'
import { TRPCError } from '@trpc/server'
import { PaymentMethod } from '@kitchencloud/database'
import { generatePayNowQR } from '../../../utils/paynow'

export const paymentRouter = router({
  // 1) Customer uploads a PayNow proof (public; we verify order existence only)
  uploadProof: publicProcedure
    .input(z.object({
      orderId: z.string(),
      proofUrl: z.string(),
      transactionId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentProof: input.proofUrl,
          paymentStatus: 'PROCESSING',
          payment: {
            update: {
              status: 'PROCESSING',
              transactionId: input.transactionId
            }
          }
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

  generateQR: publicProcedure
    .input(z.object({
      orderId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          merchant: {
            select: {
              paynowNumber: true,
              paynowQrCode: true,
              businessName: true
            }
          }
        }
      })
      
      if (!order) throw new Error('Order not found')
      
      // Use existing QR or generate new one
      let qrCode = order.merchant.paynowQrCode
      if (!qrCode && order.merchant.paynowNumber) {
        qrCode = await generatePayNowQR(
          order.merchant.paynowNumber,
          Number(order.total),
          order.orderNumber
        )
      }
      
      return {
        qrCode,
        amount: Number(order.total),
        merchantName: order.merchant.businessName,
        paynowNumber: order.merchant.paynowNumber,
        orderNumber: order.orderNumber
      }
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