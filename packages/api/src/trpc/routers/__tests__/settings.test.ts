import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { settingsRouter } from '../settings'
import { db } from '@homejiak/database'
import type { AuthSession } from '@homejiak/auth'
import bcrypt from 'bcryptjs'

// Mock dependencies
vi.mock('@homejiak/database', () => ({
  db: {
    merchant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    merchantSettings: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

vi.mock('otplib', () => ({
  authenticator: {
    generateSecret: vi.fn(() => 'TESTSECRET123456'),
    keyuri: vi.fn((id, service, secret) => `otpauth://totp/${service}:${id}?secret=${secret}`),
  },
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn((data) => Promise.resolve(`data:image/png;base64,${Buffer.from(data).toString('base64')}`)),
  },
}))

// Import after mocking
import { authenticator } from 'otplib'
import qrcode from 'qrcode'

// Helper to create mock Decimal objects
const mockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
  toFixed: (digits?: number) => value.toFixed(digits),
  valueOf: () => value,
})

// Define Context type
interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: any
  req: Request
  resHeaders: Headers
}

// Mock session
const mockMerchantSession: AuthSession = {
  user: {
    id: 'clh3sa9g10001qzrm5h4n8xo2',
    email: 'merchant@test.com',
    userType: 'merchant',
    merchant: {
      id: 'clh3sa9g10001qzrm5h4n8xo2',
      email: 'merchant@test.com',
      businessName: 'Test Restaurant',
      phone: '91234567',
      status: 'ACTIVE',
    } as any,
  },
}

// Helper functions
const createTestContext = (session: AuthSession | null = mockMerchantSession): Context => {
  return {
    db,
    session,
    supabase: null,
    req: new Request('http://localhost:3000', {
      headers: {
        'authorization': 'Bearer test-token-123',
      },
    }),
    resHeaders: new Headers(),
  }
}

const createCaller = (session: AuthSession | null = mockMerchantSession) => {
  const context = createTestContext(session)
  return settingsRouter.createCaller(context)
}

// Test data
const mockMerchant = {
  id: 'clh3sa9g10001qzrm5h4n8xo2',
  businessName: 'Test Restaurant',
  description: 'Best food in town',
  logoUrl: 'https://example.com/logo.png',
  email: 'merchant@test.com',
  phone: '91234567',
  address: '123 Test Street',
  postalCode: '123456',
  unitNumber: '#01-01',
  buildingName: 'Test Building',
  cuisineType: ['Asian', 'Western'],
  operatingHours: {
    monday: { isOpen: true, open: '09:00', close: '22:00' },
    tuesday: { isOpen: true, open: '09:00', close: '22:00' },
    wednesday: { isOpen: true, open: '09:00', close: '22:00' },
    thursday: { isOpen: true, open: '09:00', close: '22:00' },
    friday: { isOpen: true, open: '09:00', close: '23:00' },
    saturday: { isOpen: true, open: '10:00', close: '23:00' },
    sunday: { isOpen: false },
  },
  holidayDates: ['2024-12-25', '2024-01-01'],
  websiteUrl: 'https://test-restaurant.com',
  instagramHandle: '@testrestaurant',
  facebookPage: 'testrestaurant',
  tiktokHandle: '@testrestaurant',
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFee: mockDecimal(5.00),
  minimumOrder: mockDecimal(20.00),
  deliveryRadius: 10,
  preparationTime: 30,
  autoAcceptOrders: false,
  paymentMethods: ['PAYNOW', 'CASH'],
  paynowNumber: '91234567',
  paynowQrCode: 'data:image/png;base64,newqrcode',
  bankAccountNumber: '123456789',
  bankName: 'DBS',
  gstRegistered: true,
  gstNumber: 'GST123456',
  emailNotifications: true,
  smsNotifications: false,
  whatsappNotifications: true,
  orderNotificationEmail: 'orders@test.com',
  orderNotificationPhone: '91234568',
  language: 'en',
  timezone: 'Asia/Singapore',
  emailVerified: true,
  phoneVerified: true,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  lastLoginAt: new Date('2024-08-15T10:00:00Z'),
  password: 'hashedpassword',
  deliverySettings: {
    pricingModel: 'FLAT',
    flatRate: 5,
    freeDeliveryMinimum: 50,
  },
  deliveryAreas: ['Zone 1', 'Zone 2'],
  merchantSettings: {
    orderPrefix: 'ORD',
    orderNumberFormat: 'SEQUENTIAL',
    requireOrderApproval: true,
    maxAdvanceOrderDays: 7,
    showSoldOutItems: true,
    showPreparationTime: true,
    showCalories: false,
    orderConfirmationMessage: 'Thank you for your order!',
    orderReadyMessage: 'Your order is ready!',
    orderDeliveredMessage: 'Your order has been delivered!',
  },
}

describe('Settings Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSettings', () => {
    it('should return all merchant settings', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(mockMerchant as any)

      const result = await caller.getSettings()

      expect(result).toMatchObject({
        businessProfile: {
          businessName: 'Test Restaurant',
          description: 'Best food in town',
          logoUrl: 'https://example.com/logo.png',
          cuisineType: 'Asian, Western',
          operatingHours: expect.any(Object),
        },
        storeSettings: {
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFee: 5.00,
          minimumOrder: 20.00,
          deliveryRadius: 10,
          preparationTime: 30,
          autoAcceptOrders: false,
          orderPrefix: 'ORD',
          orderNumberFormat: 'SEQUENTIAL',
        },
        paymentSettings: {
          paymentMethods: ['PAYNOW', 'CASH'],
          paynowNumber: '91234567',
          paynowQrCode: 'data:image/png;base64,newqrcode',
          bankAccountNumber: '123456789',
          bankName: 'DBS',
          gstRegistered: true,
          gstNumber: 'GST123456',
        },
        notificationSettings: {
          emailNotifications: true,
          smsNotifications: false,
          whatsappNotifications: true,
          orderNotificationEmail: 'orders@test.com',
          language: 'en',
          timezone: 'Asia/Singapore',
        },
        securitySettings: {
          email: 'merchant@test.com',
          emailVerified: true,
          phoneVerified: true,
          twoFactorEnabled: false,
          lastLoginAt: expect.any(Date),
        },
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)

      await expect(caller.getSettings()).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.getSettings()).rejects.toThrow()
    })
  })

  describe('updateBusinessProfile', () => {
    it('should update business profile', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updateBusinessProfile({
        businessName: 'Updated Restaurant',
        description: 'New description',
        cuisineType: 'Italian, French',
        phone: '+6598765432',
      })

      expect(result).toMatchObject({
        success: true,
        merchant: expect.objectContaining({
          businessName: 'Test Restaurant', // Mock returns original
        }),
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: expect.objectContaining({
          businessName: 'Updated Restaurant',
          description: 'New description',
          cuisineType: ['Italian', 'French'],
          phone: '+6598765432',
        }),
      })

      expect(db.auditLog.create).toHaveBeenCalled()
    })

    it('should handle cuisine type conversion', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      await caller.updateBusinessProfile({
        businessName: 'Test',
        cuisineType: '  Italian  ,  French  ,  ',  // With spaces and trailing comma
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: expect.objectContaining({
          cuisineType: ['Italian', 'French'], // Trimmed and filtered
        }),
      })
    })

    it('should handle partial updates', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      await caller.updateBusinessProfile({
        businessName: 'Updated Name',
        // Only updating business name
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          businessName: 'Updated Name',
          description: undefined,
          logoUrl: undefined,
          phone: undefined,
          address: undefined,
          postalCode: undefined,
          unitNumber: undefined,
          buildingName: undefined,
          operatingHours: undefined,
          holidayDates: undefined,
          websiteUrl: undefined,
          instagramHandle: undefined,
          facebookPage: undefined,
          tiktokHandle: undefined,
        },
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updateBusinessProfile({
          businessName: 'Test',
        })
      ).rejects.toThrow()
    })
  })

  describe('updateStoreSettings', () => {
    it('should update store settings', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.merchantSettings.upsert).mockResolvedValue({} as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updateStoreSettings({
        deliveryEnabled: false,
        pickupEnabled: true,
        deliveryFee: 7.50,
        minimumOrder: 25.00,
        deliveryRadius: 15,
        preparationTime: 45,
        autoAcceptOrders: true,
        orderPrefix: 'INV',
        orderNumberFormat: 'RANDOM',
        requireOrderApproval: false,
        maxAdvanceOrderDays: 14,
        showSoldOutItems: false,
      })

      expect(result).toEqual({ success: true })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          deliveryEnabled: false,
          pickupEnabled: true,
          deliveryFee: 7.50,
          minimumOrder: 25.00,
          deliveryRadius: 15,
          preparationTime: 45,
          autoAcceptOrders: true,
        },
      })

      expect(db.merchantSettings.upsert).toHaveBeenCalledWith({
        where: { merchantId: 'clh3sa9g10001qzrm5h4n8xo2' },
        create: expect.objectContaining({
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
          orderPrefix: 'INV',
          orderNumberFormat: 'RANDOM',
          requireOrderApproval: false,
        }),
        update: expect.objectContaining({
          orderPrefix: 'INV',
          orderNumberFormat: 'RANDOM',
          requireOrderApproval: false,
        }),
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updateStoreSettings({
          deliveryEnabled: true,
        })
      ).rejects.toThrow()
    })
  })

  describe('updatePaymentSettings', () => {
    it('should update payment settings', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updatePaymentSettings({
        paymentMethods: ['PAYNOW'],
        paynowNumber: '+6598765432',
        paynowQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        bankAccountNumber: '+65987654321',
        bankName: 'OCBC',
        gstRegistered: false,
      })

      expect(result).toEqual({ success: true })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          paymentMethods: ['PAYNOW'],
          paynowNumber: '+6598765432',
          paynowQrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          bankAccountNumber: '+65987654321',
          bankName: 'OCBC',
          gstRegistered: false,
          gstNumber: undefined,
        },
      })
    })

    it('should redact bank account in audit log', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await caller.updatePaymentSettings({
        bankAccountNumber: '123456789',
        bankName: 'DBS',
      })

      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValues: expect.objectContaining({
            bankAccountNumber: '[REDACTED]',
            bankName: 'DBS',
          }),
          metadata: expect.objectContaining({
            hasBankAccount: true,
            fields: expect.not.arrayContaining(['bankAccountNumber']),
          }),
        }),
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updatePaymentSettings({
          paymentMethods: ['CASH'],
        })
      ).rejects.toThrow()
    })
  })

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.merchantSettings.upsert).mockResolvedValue({} as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updateNotificationSettings({
        emailNotifications: false,
        smsNotifications: true,
        whatsappNotifications: false,
        orderNotificationEmail: 'new@test.com',
        orderNotificationPhone: '+6598765432',
        language: 'zh',
        timezone: 'Asia/Shanghai',
        orderConfirmationMessage: 'Order confirmed!',
        orderReadyMessage: 'Ready!',
        orderDeliveredMessage: 'Delivered!',
      })

      expect(result).toEqual({ success: true })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          emailNotifications: false,
          smsNotifications: true,
          whatsappNotifications: false,
          orderNotificationEmail: 'new@test.com',
          orderNotificationPhone: '+6598765432',
          language: 'zh',
          timezone: 'Asia/Shanghai',
        },
      })

      expect(db.merchantSettings.upsert).toHaveBeenCalledWith({
        where: { merchantId: 'clh3sa9g10001qzrm5h4n8xo2' },
        create: expect.objectContaining({
          orderConfirmationMessage: 'Order confirmed!',
          orderReadyMessage: 'Ready!',
          orderDeliveredMessage: 'Delivered!',
        }),
        update: expect.objectContaining({
          orderConfirmationMessage: 'Order confirmed!',
          orderReadyMessage: 'Ready!',
          orderDeliveredMessage: 'Delivered!',
        }),
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updateNotificationSettings({
          emailNotifications: true,
        })
      ).rejects.toThrow()
    })
  })

  describe('updateSecuritySettings', () => {
    it('should change password', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        password: 'hashedOldPassword',
      } as any)

      vi.mocked(bcrypt.compare).mockResolvedValue(true as any)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedNewPassword' as any)
      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.session.deleteMany).mockResolvedValue({} as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updateSecuritySettings({
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      })

      expect(result).toEqual({ success: true })

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'hashedOldPassword')
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10)

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: { password: 'hashedNewPassword' },
      })

      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
          token: { not: 'test-token-123' },
        },
      })
    })

    it('should reject incorrect current password', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        password: 'hashedOldPassword',
      } as any)

      vi.mocked(bcrypt.compare).mockResolvedValue(false as any)

      await expect(
        caller.updateSecuritySettings({
          currentPassword: 'wrongPassword',
          newPassword: 'NewPassword123!',  // Valid password format
          confirmPassword: 'NewPassword123!',  // Must match
        })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Current password is incorrect',
      })
    })

    it('should enable 2FA', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        password: 'hashedPassword',
      } as any)

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updateSecuritySettings({
        twoFactorEnabled: true,
      })

      expect(result).toMatchObject({
        success: true,
        twoFactorSecret: 'TESTSECRET123456',
        qrCode: expect.stringContaining('data:image/png;base64'),
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: 'TESTSECRET123456',
        },
      })

      expect(authenticator.generateSecret).toHaveBeenCalled()
      expect(authenticator.keyuri).toHaveBeenCalledWith(
        'clh3sa9g10001qzrm5h4n8xo2',
        'KithenCloud',
        'TESTSECRET123456'
      )
      expect(qrcode.toDataURL).toHaveBeenCalled()
    })

    it('should disable 2FA', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        password: 'hashedPassword',
      } as any)

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      const result = await caller.updateSecuritySettings({
        twoFactorEnabled: false,
      })

      expect(result).toEqual({ success: true })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)

      await expect(
        caller.updateSecuritySettings({
          currentPassword: 'password',
          newPassword: 'NewPassword123!',  // Valid password format
          confirmPassword: 'NewPassword123!',  // Must match
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updateSecuritySettings({
          twoFactorEnabled: true,
        })
      ).rejects.toThrow()
    })
  })

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const caller = createCaller()

      const mockSessions = [
        {
          id: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2024-08-15T10:00:00Z'),
          lastActivityAt: new Date('2024-08-15T11:00:00Z'),
          token: 'test-token-123',
        },
        {
          id: 'session-2',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/100.0',
          createdAt: new Date('2024-08-14T10:00:00Z'),
          lastActivityAt: new Date('2024-08-14T12:00:00Z'),
          token: 'other-token',
        },
      ]

      vi.mocked(db.session.findMany).mockResolvedValue(mockSessions as any)

      const result = await caller.getActiveSessions()

      expect(result).toEqual([
        {
          id: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
          isCurrent: true,
        },
        {
          id: 'session-2',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/100.0',
          createdAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
          isCurrent: false,
        },
      ])

      expect(db.session.findMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastActivityAt: 'desc' },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          lastActivityAt: true,
          token: true,
        },
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.getActiveSessions()).rejects.toThrow()
    })
  })

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      const caller = createCaller()

      vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 1 } as any)

      const result = await caller.revokeSession({ sessionId: 'session-123' })

      expect(result).toEqual({ success: true })

      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'session-123',
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
        },
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.revokeSession({ sessionId: 'session-123' })
      ).rejects.toThrow()
    })
  })

  describe('uploadLogo', () => {
    it('should update logo URL', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      const result = await caller.uploadLogo({
        url: 'https://example.com/new-logo.png',
      })

      expect(result).toEqual({ success: true })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: { logoUrl: 'https://example.com/new-logo.png' },
      })
    })

    it('should validate URL format', async () => {
      const caller = createCaller()

      await expect(
        caller.uploadLogo({ url: 'invalid-url' })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.uploadLogo({ url: 'https://example.com/logo.png' })
      ).rejects.toThrow()
    })
  })

  describe('generatePaynowQR', () => {
    it('should generate PayNow QR code', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        businessName: 'Test Restaurant',
      } as any)

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      const result = await caller.generatePaynowQR({
        paynowNumber: '+6598765432',
      })

      expect(result).toMatchObject({
        success: true,
        qrCodeUrl: expect.stringContaining('data:image/png;base64'),
      })

      expect(qrcode.toDataURL).toHaveBeenCalledWith(
        'PayNow://+6598765432?name=Test%20Restaurant'
      )

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          paynowNumber: '+6598765432',
          paynowQrCode: expect.any(String),
        },
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)

      await expect(
        caller.generatePaynowQR({ paynowNumber: '+6598765432' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.generatePaynowQR({ paynowNumber: '+6598765432' })
      ).rejects.toThrow()
    })
  })

  describe('getDeliverySettings', () => {
    it('should return delivery settings', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: mockDecimal(5.00),
        deliveryRadius: 10,
        minimumOrder: mockDecimal(20.00),
        preparationTime: 30,
        deliverySettings: {
          pricingModel: 'ZONE',
          zoneRates: {
            sameZone: 5,
            adjacentZone: 7,
            crossZone: 10,
            specialArea: 15,
          },
        },
        deliveryAreas: ['Zone 1', 'Zone 2'],
      } as any)

      const result = await caller.getDeliverySettings()

      expect(result).toMatchObject({
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryRadius: 10,
        preparationTime: 30,
        deliveryAreas: ['Zone 1', 'Zone 2'],
        pricingModel: 'ZONE',
        zoneRates: {
          sameZone: 5,
          adjacentZone: 7,
          crossZone: 10,
          specialArea: 15,
        },
      })
    })

    it('should provide defaults if settings not configured', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: mockDecimal(8.00),
        deliveryRadius: 5,
        minimumOrder: mockDecimal(30.00),
        preparationTime: 45,
        deliverySettings: null,
        deliveryAreas: null,
      } as any)

      const result = await caller.getDeliverySettings()

      expect(result).toMatchObject({
        pricingModel: 'FLAT',
        flatRate: 8.00, // Uses deliveryFee
        freeDeliveryMinimum: 30.00, // Uses minimumOrder
        specialAreaSurcharge: 5,
        zoneRates: {
          sameZone: 5,
          adjacentZone: 7,
          crossZone: 10,
          specialArea: 15,
        },
        distanceRates: {
          baseRate: 5,
          perKmRate: 0,
          tiers: expect.arrayContaining([
            { minKm: 0, maxKm: 3, additionalFee: 0 },
          ]),
        },
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)

      await expect(caller.getDeliverySettings()).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.getDeliverySettings()).rejects.toThrow()
    })
  })

  describe('updateDeliverySettings', () => {
    it('should update delivery settings', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      const result = await caller.updateDeliverySettings({
        pricingModel: 'DISTANCE',
        distanceRates: {
          baseRate: 6,
          perKmRate: 1,
          tiers: [
            { minKm: 0, maxKm: 3, additionalFee: 0 },
            { minKm: 3, maxKm: 5, additionalFee: 3 },
          ],
        },
        deliveryRadius: 15,
        preparationTime: 45,
      })

      expect(result).toEqual({
        success: true,
        message: 'Delivery settings updated successfully',
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          deliverySettings: {
            pricingModel: 'DISTANCE',
            distanceRates: {
              baseRate: 6,
              perKmRate: 1,
              tiers: [
                { minKm: 0, maxKm: 3, additionalFee: 0 },
                { minKm: 3, maxKm: 5, additionalFee: 3 },
              ],
            },
          },
          deliveryRadius: 15,
          preparationTime: 45,
          deliveryFee: 6, // Uses baseRate for DISTANCE model
          minimumOrder: 0,
        },
      })
    })

    it('should handle FLAT pricing model', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      await caller.updateDeliverySettings({
        pricingModel: 'FLAT',
        flatRate: 10,
        freeDeliveryMinimum: 50,
        deliveryRadius: 10,
        preparationTime: 30,
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: expect.objectContaining({
          deliveryFee: 10, // Uses flatRate for FLAT model
          minimumOrder: 50,
        }),
      })
    })

    it('should handle ZONE pricing model', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      await caller.updateDeliverySettings({
        pricingModel: 'ZONE',
        zoneRates: {
          sameZone: 5,
          adjacentZone: 7,
          crossZone: 10,
          specialArea: 15,
        },
        deliveryRadius: 10,
        preparationTime: 30,
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: expect.objectContaining({
          deliveryFee: 5, // Uses sameZone for ZONE model
        }),
      })
    })

    it('should handle FREE pricing model', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      await caller.updateDeliverySettings({
        pricingModel: 'FREE',
        deliveryRadius: 10,
        preparationTime: 30,
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: expect.objectContaining({
          deliveryFee: 0, // Free delivery
          minimumOrder: 0,
        }),
      })
    })

    it('should validate delivery radius', async () => {
      const caller = createCaller()

      await expect(
        caller.updateDeliverySettings({
          pricingModel: 'FLAT',
          deliveryRadius: 100, // Too large (max 50)
          preparationTime: 30,
        })
      ).rejects.toThrow()
    })

    it('should validate preparation time', async () => {
      const caller = createCaller()

      await expect(
        caller.updateDeliverySettings({
          pricingModel: 'FLAT',
          deliveryRadius: 10,
          preparationTime: 200, // Too long (max 180)
        })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updateDeliverySettings({
          pricingModel: 'FLAT',
          deliveryRadius: 10,
          preparationTime: 30,
        })
      ).rejects.toThrow()
    })
  })

  describe('toggleDeliveryOptions', () => {
    it('should toggle delivery options', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.update).mockResolvedValue(mockMerchant as any)

      const result = await caller.toggleDeliveryOptions({
        deliveryEnabled: false,
        pickupEnabled: true,
      })

      expect(result).toEqual({
        success: true,
        message: 'Delivery options updated',
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10001qzrm5h4n8xo2' },
        data: {
          deliveryEnabled: false,
          pickupEnabled: true,
        },
      })
    })

    it('should require at least one option enabled', async () => {
      const caller = createCaller()

      await expect(
        caller.toggleDeliveryOptions({
          deliveryEnabled: false,
          pickupEnabled: false,
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'At least one delivery option must be enabled',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.toggleDeliveryOptions({
          deliveryEnabled: true,
          pickupEnabled: true,
        })
      ).rejects.toThrow()
    })
  })
})