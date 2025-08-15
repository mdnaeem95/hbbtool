import { z } from 'zod'
import { router, publicProcedure, merchantProcedure } from '../../core'
import { TRPCError } from '@trpc/server'
import { PaymentMethod, PaymentStatus } from '@kitchencloud/database'

export const paymentRouter = router({
  // 1) Customer uploads a PayNow proof (public; we verify order existence only)
  uploadProof: publicProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      fileUrl: z.string().url(),
      fileName: z.string(),
      fileSize: z.number().nonnegative(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Load order (need total, merchant, etc.)
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          total: true,
          paymentStatus: true,
          paymentMethod: true,
          paymentReference: true,
          merchantId: true,
        },
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
      }

      // If already completed, no further proof should be accepted
      if (order.paymentStatus === 'COMPLETED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment already completed',
        })
      }

      // Upsert a Payment row tied to this order
      const payment = await ctx.db.payment.upsert({
        where: { orderId: input.orderId },
        create: {
          orderId: input.orderId,
          amount: order.total,       // Decimal in schema; Prisma accepts number/Decimal
          currency: 'SGD',
          method: 'PAYNOW' as PaymentMethod,
          status: 'PENDING' as PaymentStatus,
          referenceNumber: order.paymentReference ?? undefined,
          gatewayProvider: 'paynow',
        },
        update: {
          status: 'PENDING',
          method: 'PAYNOW',
          referenceNumber: order.paymentReference ?? undefined,
          gatewayProvider: 'paynow',
          // Keep amount as-is (or align to order total again)
          amount: order.total,
        },
      })

      // Update order with proof + set paymentStatus → PENDING
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: 'PENDING',
          paymentMethod: 'PAYNOW',
          paymentProof: input.fileUrl,
        },
      })

      // Log event
      await ctx.db.orderEvent.create({
        data: {
          orderId: input.orderId,
          event: 'payment_proof_uploaded',
          data: {
            fileUrl: input.fileUrl,
            fileName: input.fileName,
            fileSize: input.fileSize,
            mimeType: input.mimeType,
            paymentId: payment.id,
          },
        },
      })

      return { success: true, paymentId: payment.id }
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
  verifyPayment: merchantProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      amount: z.number().positive(),
      transactionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure the order belongs to the merchant
      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, merchantId: ctx.session.user.id },
        select: {
          id: true,
          total: true,
          status: true,
          paymentStatus: true,
          paymentReference: true,
        },
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
      }

      // Upsert payment -> COMPLETED
      const payment = await ctx.db.payment.upsert({
        where: { orderId: input.orderId },
        create: {
          orderId: input.orderId,
          amount: input.amount,
          currency: 'SGD',
          method: 'PAYNOW',
          status: 'COMPLETED',
          transactionId: input.transactionId,
          gatewayProvider: 'paynow',
          referenceNumber: order.paymentReference ?? undefined,
          processedAt: new Date(),
        },
        update: {
          status: 'COMPLETED',
          amount: input.amount,
          transactionId: input.transactionId,
          processedAt: new Date(),
          method: 'PAYNOW',
        },
      })

      // Update order payment fields and bump status to CONFIRMED (if still pending)
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentMethod: 'PAYNOW',
          paymentConfirmedAt: new Date(),
          paymentConfirmedBy: ctx.session.user.id,
          // Move to CONFIRMED only if not already beyond that state
          status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
        },
      })

      await ctx.db.orderEvent.create({
        data: {
          orderId: input.orderId,
          event: 'payment_verified',
          data: {
            amount: input.amount,
            transactionId: input.transactionId,
            paymentId: payment.id,
            confirmedBy: ctx.session.user.id,
          },
        },
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
})