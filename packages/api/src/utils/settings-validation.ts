import { z } from "zod"
import { PaymentMethod } from "@kitchencloud/database/types"

// Operating hours schema
const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")

const dayScheduleSchema = z.object({
  isOpen: z.boolean(),
  open: timeSchema.optional(),
  close: timeSchema.optional(),
})

export const operatingHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
})

// Business profile schema
export const businessProfileSchema = z.object({
  businessName: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  phone: z.string().regex(/^\+65[689]\d{7}$/, "Invalid Singapore phone number").optional(),
  address: z.string().max(200).optional(),
  postalCode: z.string().regex(/^\d{6}$/, "Invalid postal code").optional(),
  unitNumber: z.string().max(20).optional(),
  buildingName: z.string().max(100).optional(),
  cuisineType: z.string().optional(),
  operatingHours: operatingHoursSchema.optional(),
  holidayDates: z.array(z.date()).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  instagramHandle: z.string().regex(/^@?[a-zA-Z0-9._]+$/, "Invalid Instagram handle").optional().or(z.literal("")),
  facebookPage: z.string().optional(),
  tiktokHandle: z.string().regex(/^@?[a-zA-Z0-9._]+$/, "Invalid TikTok handle").optional().or(z.literal("")),
})

// Store settings schema
export const storeSettingsSchema = z.object({
  // Delivery settings
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryFee: z.number().min(0).max(50),
  minimumOrder: z.number().min(0).max(1000),
  deliveryRadius: z.number().min(1).max(20),
  preparationTime: z.number().min(5).max(180),
  autoAcceptOrders: z.boolean(),
  
  // Order settings
  orderPrefix: z.string().max(10).default("ORD"),
  orderNumberFormat: z.enum(["SEQUENTIAL", "RANDOM"]).default("SEQUENTIAL"),
  requireOrderApproval: z.boolean().default(true),
  maxAdvanceOrderDays: z.number().min(1).max(30).default(7),
  
  // Display settings
  showSoldOutItems: z.boolean().default(true),
  showPreparationTime: z.boolean().default(true),
  showCalories: z.boolean().default(false),
})

// Payment settings schema
export const paymentSettingsSchema = z.object({
  paymentMethods: z.array(z.nativeEnum(PaymentMethod)).min(1, "At least one payment method is required"),
  paynowNumber: z.string().optional(),
  paynowQrCode: z.string().url().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  gstRegistered: z.boolean(),
  gstNumber: z.string().optional(),
}).refine(
  (data) => {
    if (data.paymentMethods.includes("PAYNOW") && !data.paynowNumber) {
      return false
    }
    return true
  },
  {
    message: "PayNow number is required when PayNow is enabled",
    path: ["paynowNumber"],
  }
).refine(
  (data) => {
    if (data.gstRegistered && !data.gstNumber) {
      return false
    }
    return true
  },
  {
    message: "GST number is required when GST is registered",
    path: ["gstNumber"],
  }
)

// Notification settings schema
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
  orderNotificationEmail: z.string().email().optional().or(z.literal("")),
  orderNotificationPhone: z.string().regex(/^\+65[689]\d{7}$/, "Invalid phone number").optional().or(z.literal("")),
  language: z.enum(["en", "zh", "ms", "ta"]).default("en"),
  timezone: z.string().default("Asia/Singapore"),
  
  // Notification templates
  orderConfirmationMessage: z.string().max(500).optional(),
  orderReadyMessage: z.string().max(500).optional(),
  orderDeliveredMessage: z.string().max(500).optional(),
})

// Security settings schema
export const securitySettingsSchema = z.object({
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Password must contain uppercase, lowercase, number and special character"
  ).optional(),
  confirmPassword: z.string().optional(),
  twoFactorEnabled: z.boolean().optional(),
  twoFactorCode: z.string().length(6).optional(),
}).refine(
  (data) => {
    if (data.newPassword && data.newPassword !== data.confirmPassword) {
      return false
    }
    return true
  },
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) {
      return false
    }
    return true
  },
  {
    message: "Current password is required to change password",
    path: ["currentPassword"],
  }
)