import { router, protectedProcedure } from '../../core'
import { z } from 'zod'
import { db } from '@homejiak/database'
import { TRPCError } from '@trpc/server'

type ChecklistProgress = {
  profile?: boolean
  product?: boolean
  payment?: boolean
  delivery?: boolean
  testOrder?: boolean
}

export const onboardingRouter = router({
  getProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const merchantId = ctx.session?.user.id
      
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId },
        select: {
          onboardingCompleted: true,
          onboardingStep: true,
          tourCompleted: true,
          checklistProgress: true,
          firstLoginAt: true,
          createdAt: true,
        }
      })
      
      // Calculate checklist completion
      const checklistProgress = (merchant?.checklistProgress || {}) as ChecklistProgress
      const completed = Object.entries(checklistProgress).filter(
        ([, value]) => value === true
        ).length
      
      return {
        isFirstLogin: !merchant?.firstLoginAt,
        onboardingCompleted: merchant?.onboardingCompleted || false,
        currentStep: merchant?.onboardingStep || 0,
        tourCompleted: merchant?.tourCompleted || false,
        checklistProgress: merchant?.checklistProgress || {},
        completionPercentage: (completed / 5) * 100,
        daysSinceSignup: merchant ? 
          Math.floor((Date.now() - merchant.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
      }
    }),

    updateTourStatus: protectedProcedure
    .input(z.object({
        step: z.number(),
        completed: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
        const merchantId = ctx.session!.user.id  // Use ! since protectedProcedure guarantees session exists
        
        await db.merchant.update({
        where: { id: merchantId },
        data: {
            onboardingStep: input.step,
            tourCompleted: input.completed,
            firstLoginAt: new Date()
        }
        })
        
        // Track event
        await db.onboardingEvent.create({
        data: {
            merchantId: merchantId,  // Now it's guaranteed to be a string
            eventType: input.completed ? 'tour_completed' : 'tour_progress',
            metadata: { step: input.step }
        }
        })
        
        return { success: true }
    }),

    updateChecklist: protectedProcedure
    .input(z.object({
        item: z.enum(['profile', 'product', 'payment', 'delivery', 'testOrder']),
        completed: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
        const merchantId = ctx.session!.user.id  // protectedProcedure guarantees session
        
        const merchant = await db.merchant.findUnique({
        where: { id: merchantId },
        select: { checklistProgress: true }
        })
        
        if (!merchant) {
        throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Merchant not found'
        })
        }
        
        // Update progress
        const progress = (merchant.checklistProgress || {}) as ChecklistProgress
        progress[input.item] = input.completed
        
        // Check if all items are completed
        const allCompleted = ['profile', 'product', 'payment', 'delivery', 'testOrder']
        .every(key => progress[key as keyof ChecklistProgress] === true)
        
        await db.merchant.update({
        where: { id: merchantId },
        data: {
            checklistProgress: progress,
            onboardingCompleted: allCompleted
        }
        })
        
        // Track event
        await db.onboardingEvent.create({
        data: {
            merchantId: merchantId,  // Now guaranteed to be a string
            eventType: 'checklist_item_completed',
            metadata: { 
            item: input.item,
            completed: input.completed,
            allCompleted
            }
        }
        })
        
        return { 
        success: true,
        progress,
        isFullyCompleted: allCompleted
        }
    }),

  skipOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db.merchant.update({
        where: { id: ctx.session?.user.id },
        data: {
          onboardingCompleted: true,
          tourCompleted: true
        }
      })
      
      return { success: true }
    })
})