import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { adminProcedure, router } from '../../core'
import { createClient } from '@supabase/supabase-js'
import { sendMerchantApprovalEmail, sendMerchantRejectionEmail } from '../../../services/email'

// Create Supabase Admin client for user management
// This requires the service role key
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

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
          settings: true,
        },
      })

      return { merchants }
    }),

  // Approve merchant
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

      // Update merchant status in database
      const updatedMerchant = await ctx.db.merchant.update({
        where: { id: input.merchantId },
        data: {
          status: 'ACTIVE',
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: ctx.merchant?.id || 'admin',
          settings: {
            ...(merchant.settings as any || {}),
            approvalNotes: input.notes,
            approvedAt: new Date().toISOString(),
            approvedBy: ctx.merchant?.email,
          },
        },
      })

      // Confirm the Supabase user
      if (supabaseAdmin) {
        try {
          // First, get the user by email
          const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 50,
          })

          if (!searchError && users) {
            const supabaseUser = users.users.find(
              u => u.email?.toLowerCase() === merchant.email.toLowerCase()
            )

            if (supabaseUser) {
              // Update user to confirmed
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                supabaseUser.id,
                {
                  email_confirm: true,
                  user_metadata: {
                    ...supabaseUser.user_metadata,
                    merchantApproved: true,
                    approvedAt: new Date().toISOString(),
                  }
                }
              )

              if (updateError) {
                console.error('Failed to confirm Supabase user:', updateError)
                // Don't throw - merchant is approved in our system
              } else {
                console.log(`✅ Supabase user confirmed for: ${merchant.email}`)
              }
            } else {
              console.warn(`⚠️ Supabase user not found for: ${merchant.email}`)
            }
          }
        } catch (error) {
          console.error('Supabase confirmation error:', error)
          // Don't throw - merchant is approved in our system
        }
      } else {
        console.warn('⚠️ No service role key - cannot confirm Supabase user automatically')
        console.log('💡 Add SUPABASE_SERVICE_ROLE_KEY to .env to enable auto-confirmation')
      }

      console.log(`✅ Approved merchant: ${merchant.businessName} (${merchant.email})`)
      
      // Send welcome email
      await sendMerchantApprovalEmail(merchant.email, merchant.businessName)

      return {
        success: true,
        merchant: updatedMerchant,
      }
    }),

  // Reject merchant
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

      if (merchant.status !== 'PENDING_VERIFICATION') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Merchant is not pending approval',
        })
      }

      // Update merchant status
      const updatedMerchant = await ctx.db.merchant.update({
        where: { id: input.merchantId },
        data: {
          status: 'SUSPENDED',
          suspensionReason: input.reason,
          settings: {
            ...(merchant.settings as any || {}),
            rejectionReason: input.reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: ctx.merchant?.email,
          },
        },
      })

      // Delete or deactivate the Supabase user
      if (supabaseAdmin) {
        try {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 50,
          })

          const supabaseUser = users?.users.find(
            u => u.email?.toLowerCase() === merchant.email.toLowerCase()
          )

          if (supabaseUser) {
            await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id)
            console.log(`🗑️ Deleted Supabase user for rejected merchant: ${merchant.email}`)
          }
        } catch (error) {
          console.error('Failed to delete Supabase user:', error)
        }
      }

      console.log(`❌ Rejected merchant: ${merchant.businessName} (${merchant.email})`)
      
      // Send rejection email
      await sendMerchantRejectionEmail(merchant.email, merchant.businessName, input.reason)

      return {
        success: true,
        merchant: updatedMerchant,
      }
    }),

  // Get all merchants with filters
  getAllMerchants: adminProcedure
    .input(z.object({
      status: z.enum(['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED']).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { deletedAt: null }
      
      if (input.status) {
        where.status = input.status
      }
      
      if (input.search) {
        where.OR = [
          { businessName: { contains: input.search, mode: 'insensitive' } },
          { email: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      const [merchants, total] = await Promise.all([
        ctx.db.merchant.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.merchant.count({ where }),
      ])

      return {
        merchants,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      }
    }),
})