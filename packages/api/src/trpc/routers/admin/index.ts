import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { adminProcedure, router } from '../../core'

export const adminRouter = router({
  // Get pending merchants
  getPendingMerchants: adminProcedure
    .query(async ({ ctx }) => {
      const merchants = await ctx.db.merchant.findMany({
        where: { 
          status: 'PENDING_VERIFICATION',
          deletedAt: null 
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          businessName: true,
          slug: true,
          businessType: true,
          description: true,
          websiteUrl: true,
          createdAt: true,
          settings: true, // Contains signup metadata
        },
      })

      return { merchants }
    }),

  // Approve merchant - using existing fields!
  approveMerchant: adminProcedure
    .input(z.object({
      merchantId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found',
        })
      }

      if (merchant.status !== 'PENDING_VERIFICATION') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Merchant is not pending approval',
        })
      }

      // Update using YOUR EXISTING FIELDS
      const updatedMerchant = await ctx.db.merchant.update({
        where: { id: input.merchantId },
        data: {
          status: 'ACTIVE',           // Your field
          verified: true,             // Your field
          verifiedAt: new Date(),     // Your field
          verifiedBy: ctx.session?.user.id || 'admin',  // Your field
          settings: {
            ...(merchant.settings as any || {}),
            approvalNotes: input.notes,
            approvedAt: new Date().toISOString(),
          },
        },
      })

      // Send welcome email
      console.log(`✅ Approved: ${merchant.businessName}`)
      console.log(`📧 Would send welcome email to: ${merchant.email}`)
      // In production: await sendWelcomeEmail(merchant)

      return updatedMerchant
    }),

  // Reject merchant - using existing fields!
  rejectMerchant: adminProcedure
    .input(z.object({
      merchantId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found',
        })
      }

      // Update using YOUR EXISTING FIELDS
      const updatedMerchant = await ctx.db.merchant.update({
        where: { id: input.merchantId },
        data: {
          status: 'SUSPENDED',              // Your field
          suspensionReason: input.reason,   // Your field!
          verified: false,
          settings: {
            ...(merchant.settings as any || {}),
            rejectedAt: new Date().toISOString(),
            rejectedBy: ctx.session?.user.id || 'admin',
          },
        },
      })

      // Send rejection email
      console.log(`❌ Rejected: ${merchant.businessName}`)
      console.log(`📧 Would send rejection email to: ${merchant.email}`)
      // In production: await sendRejectionEmail(merchant, input.reason)

      return updatedMerchant
    }),
})