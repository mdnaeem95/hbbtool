import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { businessProfileSchema, storeSettingsSchema, paymentSettingsSchema, notificationSettingsSchema, securitySettingsSchema 
} from "../../../utils/settings-validation"
import { authenticator } from "otplib"
import { merchantProcedure, router } from "../../core"
import bcrypt from "bcryptjs"
import qrcode from "qrcode"
import { generatePayNowQR } from "../../../utils/paynow"

// Type for operating hours
type OperatingHours = {
  monday: { isOpen: boolean; open?: string; close?: string }
  tuesday: { isOpen: boolean; open?: string; close?: string }
  wednesday: { isOpen: boolean; open?: string; close?: string }
  thursday: { isOpen: boolean; open?: string; close?: string }
  friday: { isOpen: boolean; open?: string; close?: string }
  saturday: { isOpen: boolean; open?: string; close?: string }
  sunday: { isOpen: boolean; open?: string; close?: string }
}

// Validation schemas
const deliveryPricingModelEnum = z.enum(['FLAT', 'DISTANCE', 'ZONE', 'FREE'])

const deliveryZoneRatesSchema = z.object({
  sameZone: z.number().min(0).max(50),
  adjacentZone: z.number().min(0).max(50),
  crossZone: z.number().min(0).max(50),
  specialArea: z.number().min(0).max(100)
})

const deliveryDistanceTierSchema = z.object({
  minKm: z.number().min(0),
  maxKm: z.number().max(50),
  additionalFee: z.number().min(0).max(100)
})

const deliveryDistanceRatesSchema = z.object({
  baseRate: z.number().min(0).max(50),
  perKmRate: z.number().min(0).max(10),
  tiers: z.array(deliveryDistanceTierSchema).max(5)
})

const deliverySettingsSchema = z.object({
  pricingModel: deliveryPricingModelEnum,
  flatRate: z.number().min(0).max(50).optional(),
  zoneRates: deliveryZoneRatesSchema.optional(),
  distanceRates: deliveryDistanceRatesSchema.optional(),
  freeDeliveryMinimum: z.number().min(0).max(500).optional(),
  specialAreaSurcharge: z.number().min(0).max(50).optional(),
})

export const settingsRouter = router({
  // Get all settings
  getSettings: merchantProcedure.query(async ({ ctx }) => {
    const merchantId = ctx.session!.user.id
    
    const merchant = await ctx.db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        merchantSettings: true,
      },
    })

    if (!merchant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Merchant not found",
      })
    }

    // Transform data for frontend
    return {
      businessProfile: {
        businessName: merchant.businessName,
        description: merchant.description || undefined,
        logoUrl: merchant.logoUrl || undefined,
        phone: merchant.phone || undefined,
        address: merchant.address || undefined,
        postalCode: merchant.postalCode || undefined,
        unitNumber: merchant.unitNumber || undefined,
        buildingName: merchant.buildingName || undefined,
        cuisineType: merchant.cuisineType.join(", "), // Convert array to string
        operatingHours: (merchant.operatingHours as OperatingHours | null) || undefined,
        holidayDates: merchant.holidayDates || undefined,
        websiteUrl: merchant.websiteUrl || undefined,
        instagramHandle: merchant.instagramHandle || undefined,
        facebookPage: merchant.facebookPage || undefined,
        tiktokHandle: merchant.tiktokHandle || undefined,
      },
      storeSettings: {
        deliveryEnabled: merchant.deliveryEnabled,
        pickupEnabled: merchant.pickupEnabled,
        deliveryFee: Number(merchant.deliveryFee),
        minimumOrder: Number(merchant.minimumOrder),
        deliveryRadius: merchant.deliveryRadius,
        preparationTime: merchant.preparationTime,
        autoAcceptOrders: merchant.autoAcceptOrders,
        orderPrefix: merchant.merchantSettings?.orderPrefix || "ORD",
        orderNumberFormat: (merchant.merchantSettings?.orderNumberFormat || "SEQUENTIAL") as "SEQUENTIAL" | "RANDOM",
        requireOrderApproval: merchant.merchantSettings?.requireOrderApproval ?? true,
        maxAdvanceOrderDays: merchant.merchantSettings?.maxAdvanceOrderDays || 7,
        showSoldOutItems: merchant.merchantSettings?.showSoldOutItems ?? true,
        showPreparationTime: merchant.merchantSettings?.showPreparationTime ?? true,
        showCalories: merchant.merchantSettings?.showCalories ?? false,
        orderConfirmationMessage: merchant.merchantSettings?.orderConfirmationMessage || undefined,
        orderReadyMessage: merchant.merchantSettings?.orderReadyMessage || undefined,
        orderDeliveredMessage: merchant.merchantSettings?.orderDeliveredMessage || undefined,
      },
      paymentSettings: {
        paymentMethods: merchant.paymentMethods,
        paynowNumber: merchant.paynowNumber || undefined,
        paynowQrCode: merchant.paynowQrCode || undefined,
        bankAccountNumber: merchant.bankAccountNumber || undefined,
        bankName: merchant.bankName || undefined,
        gstRegistered: merchant.gstRegistered,
        gstNumber: merchant.gstNumber || undefined,
      },
      notificationSettings: {
        emailNotifications: merchant.emailNotifications,
        smsNotifications: merchant.smsNotifications,
        whatsappNotifications: merchant.whatsappNotifications,
        orderNotificationEmail: merchant.orderNotificationEmail || undefined,
        orderNotificationPhone: merchant.orderNotificationPhone || undefined,
        language: merchant.language as "en" | "zh" | "ms" | "ta",
        timezone: merchant.timezone,
        orderConfirmationMessage: merchant.merchantSettings?.orderConfirmationMessage || undefined,
        orderReadyMessage: merchant.merchantSettings?.orderReadyMessage || undefined,
        orderDeliveredMessage: merchant.merchantSettings?.orderDeliveredMessage || undefined,
      },
      securitySettings: {
        email: merchant.email,
        emailVerified: merchant.emailVerified,
        phoneVerified: merchant.phoneVerified,
        twoFactorEnabled: merchant.twoFactorEnabled,
        lastLoginAt: merchant.lastLoginAt || undefined,
      },
    }
  }),

  // Update business profile
  updateBusinessProfile: merchantProcedure
    .input(businessProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      try {
        const cuisineTypeArray = input.cuisineType 
          ? input.cuisineType.split(",").map(s => s.trim()).filter(Boolean)
          : undefined

        const merchant = await ctx.db.merchant.update({
          where: { id: merchantId },
          data: {
            businessName: input.businessName,
            description: input.description,
            logoUrl: input.logoUrl,
            phone: input.phone,
            address: input.address,
            postalCode: input.postalCode,
            unitNumber: input.unitNumber,
            buildingName: input.buildingName,
            ...(cuisineTypeArray && { cuisineType: cuisineTypeArray }),
            operatingHours: input.operatingHours,
            holidayDates: input.holidayDates,
            websiteUrl: input.websiteUrl,
            instagramHandle: input.instagramHandle,
            facebookPage: input.facebookPage,
            tiktokHandle: input.tiktokHandle,
          },
        })

        // Log the change
        await ctx.db.auditLog.create({
          data: {
            entityType: "Merchant",
            entityId: merchantId,
            action: "UPDATE",
            userId: merchantId,
            userType: "merchant",
            newValues: input,
            metadata: { fields: Object.keys(input) },
          },
        })

        return { success: true, merchant }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update business profile",
        })
      }
    }),

  // Update store settings
  updateStoreSettings: merchantProcedure
    .input(storeSettingsSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      const { 
        deliveryEnabled,
        pickupEnabled,
        deliveryFee,
        minimumOrder,
        deliveryRadius,
        preparationTime,
        autoAcceptOrders,
        ...merchantSettingsData
      } = input

      try {
        // Update merchant fields
        await ctx.db.merchant.update({
          where: { id: merchantId },
          data: {
            deliveryEnabled,
            pickupEnabled,
            deliveryFee,
            minimumOrder,
            deliveryRadius,
            preparationTime,
            autoAcceptOrders,
          },
        })

        // Update or create merchant settings
        await ctx.db.merchantSettings.upsert({
          where: { merchantId },
          create: {
            merchantId,
            ...merchantSettingsData,
          },
          update: merchantSettingsData,
        })

        await ctx.db.auditLog.create({
          data: {
            entityType: "Merchant",
            entityId: merchantId,
            action: "UPDATE",
            userId: merchantId,
            userType: "merchant",
            newValues: input,
            metadata: { fields: Object.keys(input) },
          },
        })

        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update store settings",
        })
      }
    }),

  // Update payment settings
  updatePaymentSettings: merchantProcedure
    .input(paymentSettingsSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      try {
        await ctx.db.merchant.update({
          where: { id: merchantId },
          data: {
            paymentMethods: input.paymentMethods,
            paynowNumber: input.paynowNumber,
            paynowQrCode: input.paynowQrCode,
            bankAccountNumber: input.bankAccountNumber,
            bankName: input.bankName,
            gstRegistered: input.gstRegistered,
            gstNumber: input.gstNumber,
          },
        })

        await ctx.db.auditLog.create({
          data: {
            entityType: "Merchant",
            entityId: merchantId,
            action: "UPDATE",
            userId: merchantId,
            userType: "merchant",
            newValues: { 
              ...input,
              bankAccountNumber: input.bankAccountNumber ? "[REDACTED]" : undefined 
            },
            metadata: { 
              fields: Object.keys(input).filter(k => k !== 'bankAccountNumber'),
              hasBankAccount: !!input.bankAccountNumber,
            },
          },
        })

        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update payment settings",
        })
      }
    }),

  // Update notification settings
  updateNotificationSettings: merchantProcedure
    .input(notificationSettingsSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      const {
        orderConfirmationMessage,
        orderReadyMessage,
        orderDeliveredMessage,
        ...merchantData
      } = input

      try {
        await ctx.db.merchant.update({
          where: { id: merchantId },
          data: merchantData,
        })

        // Update notification templates
        if (orderConfirmationMessage !== undefined || 
            orderReadyMessage !== undefined || 
            orderDeliveredMessage !== undefined) {
          await ctx.db.merchantSettings.upsert({
            where: { merchantId },
            create: {
              merchantId,
              orderConfirmationMessage,
              orderReadyMessage,
              orderDeliveredMessage,
            },
            update: {
              orderConfirmationMessage,
              orderReadyMessage,
              orderDeliveredMessage,
            },
          })
        }

        await ctx.db.auditLog.create({
          data: {
            entityType: "Merchant",
            entityId: merchantId,
            action: "UPDATE",
            userId: merchantId,
            userType: "merchant",
            newValues: input,
            metadata: { fields: Object.keys(input) },
          },
        })

        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update notification settings",
        })
      }
    }),

  // Update security settings
  updateSecuritySettings: merchantProcedure
    .input(securitySettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { id: merchantId },
          select: { password: true },
        })

        if (!merchant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Merchant not found",
          })
        }

        // Handle password change
        if (input.currentPassword && input.newPassword) {
          const isValid = await bcrypt.compare(input.currentPassword, merchant.password)
          
          if (!isValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Current password is incorrect",
            })
          }

          const hashedPassword = await bcrypt.hash(input.newPassword, 10)
          
          await ctx.db.merchant.update({
            where: { id: merchantId },
            data: { password: hashedPassword },
          })

          // Invalidate all sessions except current
          await ctx.db.session.deleteMany({
            where: {
              merchantId,
              token: { not: ctx.req.headers.get('authorization')?.replace('Bearer ', '') },
            },
          })
        }

        // Handle 2FA toggle
        if (input.twoFactorEnabled !== undefined) {
          const twoFactorSecret = input.twoFactorEnabled
            ? authenticator.generateSecret()
            : null

          await ctx.db.merchant.update({
            where: { id: merchantId },
            data: {
              twoFactorEnabled: input.twoFactorEnabled,
              twoFactorSecret,
            },
          })

          if (input.twoFactorEnabled && twoFactorSecret) {
            const otpAuthUrl = authenticator.keyuri(
                merchantId,
                'KithenCloud',
                twoFactorSecret
            )

            const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl)

            return { 
              success: true, 
              twoFactorSecret,
              qrCode: qrCodeDataUrl
            }
          }
        }

        await ctx.db.auditLog.create({
          data: {
            entityType: "Merchant",
            entityId: merchantId,
            action: "UPDATE",
            userId: merchantId,
            userType: "merchant",
            newValues: {
              passwordChanged: !!(input.currentPassword && input.newPassword),
              twoFactorChanged: input.twoFactorEnabled !== undefined,
            },
            metadata: { 
              passwordChanged: !!(input.currentPassword && input.newPassword),
              twoFactorChanged: input.twoFactorEnabled !== undefined,
            },
          },
        })

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update security settings",
        })
      }
    }),

  // Get active sessions
  getActiveSessions: merchantProcedure.query(async ({ ctx }) => {
    const merchantId = ctx.session!.user.id
    
    const sessions = await ctx.db.session.findMany({
      where: { 
        merchantId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActivityAt: true,
        token: true
      },
    })

    const currentToken = ctx.req.headers.get('authorization')?.replace('Bearer ', '')

    return sessions.map(session => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      isCurrent: session.token === currentToken,
    }))
  }),

  // Revoke session
  revokeSession: merchantProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      await ctx.db.session.deleteMany({
        where: {
          id: input.sessionId,
          merchantId,
        },
      })

      return { success: true }
    }),

  // Upload logo
  uploadLogo: merchantProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      await ctx.db.merchant.update({
        where: { id: merchantId },
        data: { logoUrl: input.url },
      })

      return { success: true }
    }),

  // Generate PayNow QR
  generatePaynowQR: merchantProcedure
    .input(z.object({ paynowNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id

      // Get merchant details
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: merchantId },
        select: { businessName: true },
      })
      
      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        })
      }
      
      // Generate SGQR-compliant QR code
      // Pass 0 as amount to make it editable by the customer
      const qrCodeUrl = await generatePayNowQR(
        input.paynowNumber,
        0, // Amount set to 0 for editable amount
        undefined, // No reference number for settings QR
        merchant.businessName
      )


      await ctx.db.merchant.update({
        where: { id: merchantId },
        data: { 
          paynowNumber: input.paynowNumber,
          paynowQrCode: qrCodeUrl,
        },
      })

      return { success: true, qrCodeUrl }
    }),

  // Get merchant's delivery settings
  getDeliverySettings: merchantProcedure
    .query(async ({ ctx }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: ctx.session?.user.id },
        select: {
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFee: true,
          deliveryRadius: true,
          minimumOrder: true,
          deliverySettings: true,
          preparationTime: true,
          deliveryAreas: true,
        }
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found'
        })
      }

      // Parse existing settings or provide defaults
      const defaultSettings = {
        pricingModel: 'FLAT' as const,
        flatRate: Number(merchant.deliveryFee || 5),
        specialAreaSurcharge: 5,
        freeDeliveryMinimum: Number(merchant.minimumOrder || 0),
        zoneRates: {
          sameZone: 5,
          adjacentZone: 7,
          crossZone: 10,
          specialArea: 15
        },
        distanceRates: {
          baseRate: 5,
          perKmRate: 0,
          tiers: [
            { minKm: 0, maxKm: 3, additionalFee: 0 },
            { minKm: 3, maxKm: 5, additionalFee: 2 },
            { minKm: 5, maxKm: 10, additionalFee: 4 },
            { minKm: 10, maxKm: 15, additionalFee: 6 }
          ]
        }
      }

      const deliverySettings = merchant.deliverySettings 
        ? { ...defaultSettings, ...(merchant.deliverySettings as any) }
        : defaultSettings

      return {
        deliveryEnabled: merchant.deliveryEnabled,
        pickupEnabled: merchant.pickupEnabled,
        deliveryRadius: merchant.deliveryRadius,
        preparationTime: merchant.preparationTime,
        deliveryAreas: merchant.deliveryAreas,
        ...deliverySettings
      }
    }),

  // Update delivery settings
  updateDeliverySettings: merchantProcedure
    .input(deliverySettingsSchema.extend({
      deliveryRadius: z.number().min(1).max(50),
      preparationTime: z.number().min(5).max(180),
    }))
    .mutation(async ({ ctx, input }) => {
      const { deliveryRadius, preparationTime, ...deliverySettings } = input

      // Update merchant settings
      await ctx.db.merchant.update({
        where: { id: ctx.session?.user.id },
        data: {
          deliverySettings: deliverySettings as any,
          deliveryRadius,
          preparationTime,
          // Update base fields for backward compatibility
          deliveryFee: 
            deliverySettings.pricingModel === 'FLAT' ? deliverySettings.flatRate :
            deliverySettings.pricingModel === 'ZONE' ? deliverySettings.zoneRates?.sameZone :
            deliverySettings.pricingModel === 'DISTANCE' ? deliverySettings.distanceRates?.baseRate :
            0,
          minimumOrder: deliverySettings.freeDeliveryMinimum || 0,
        }
      })

      return {
        success: true,
        message: 'Delivery settings updated successfully'
      }
    }),

  // Toggle delivery/pickup options
  toggleDeliveryOptions: merchantProcedure
    .input(z.object({
      deliveryEnabled: z.boolean(),
      pickupEnabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure at least one option is enabled
      if (!input.deliveryEnabled && !input.pickupEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one delivery option must be enabled'
        })
      }

      await ctx.db.merchant.update({
        where: { id: ctx.session?.user.id },
        data: {
          deliveryEnabled: input.deliveryEnabled,
          pickupEnabled: input.pickupEnabled,
        }
      })

      return {
        success: true,
        message: 'Delivery options updated'
      }
    }),
})