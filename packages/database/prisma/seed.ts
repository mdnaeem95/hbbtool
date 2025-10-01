import { PrismaClient, MerchantStatus, SubscriptionTier, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Create Supabase client for auth operations
const supabase = createClient(
  "https://itvvdfmgoegsfwkkstkq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dnZkZm1nb2Vnc2Z3a2tzdGtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU0NDA3NCwiZXhwIjoyMDcwMTIwMDc0fQ.uishgR7bHKyDYZDKWL7GQtNgnizLzS-pbFhVKLlNBLU",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function createMerchantWithAuth(merchantData: any) {
  // Create Supabase auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: merchantData.email,
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      userType: 'merchant',
      businessName: merchantData.businessName
    }
  })

  if (authError) {
    console.error(`❌ Failed to create Supabase auth user for ${merchantData.email}:`, authError)
    throw authError
  }

  console.log(`✅ Supabase auth user created: ${authUser.user?.email}`)

  // Create merchant in database
  const merchant = await prisma.merchant.create({
    data: {
      ...merchantData,
      supabaseId: authUser.user?.id,
      password: await bcrypt.hash('password123', 10),
    }
  })

  return merchant
}

async function main() {
  console.log('🌱 Starting merchant seed...')

  // Clear existing merchant data (preserving other data for testing)
  console.log('🧹 Clearing existing merchant data...')
  await prisma.merchantSettings.deleteMany()
  // await prisma.merchant.deleteMany()

  // Merchant 1: Premium Chinese Restaurant (Established)
  const merchant1 = await createMerchantWithAuth({
    // Core Details
    email: 'mdm.wongs@kitchencloud.sg',
    phone: '91234568',
    businessName: "Mdm Wong's Kitchen",
    slug: 'mdm-wongs-kitchen',
    
    // Business Details
    description: 'Three generations of authentic Cantonese home cooking. Specializing in traditional soups, dim sum, and wok hei dishes that taste like grandma made them.',
    businessType: 'Home-based Restaurant',
    businessRegistrationNumber: 'T18FC0234K',
    cuisineType: ['Chinese', 'Cantonese', 'Dim Sum'],
    halal: false,
    
    // Legal & Compliance
    licenseNumber: 'SFA-HB-2023-005678',
    licenseExpiryDate: new Date('2025-06-30'),
    insuranceExpiryDate: new Date('2025-08-15'),
    nric: 'S1234567D', // Will be encrypted
    
    // Banking & Finance
    bankAccountName: "Wong Mei Lin",
    bankAccountNumber: '123-456789-0',
    bankName: 'DBS Bank',
    paynowNumber: '91234568',
    paynowQrCode: 'https://api.qr-code-generator.com/v1/create?data=91234568',
    gstRegistered: true,
    gstNumber: 'M2-0012345-6',
    
    // Contact & Social
    whatsappNumber: '91234568',
    instagramHandle: '@mdmwongs_kitchen',
    facebookPage: 'MdmWongsKitchenSG',
    tiktokHandle: '@mdmwongs',
    websiteUrl: 'https://mdmwongs.com.sg',
    
    // Location (Tampines)
    address: 'Blk 825 Tampines Street 81',
    postalCode: '520825',
    unitNumber: '#03-142',
    buildingName: 'Tampines GreenRidge',
    country: 'SG',
    latitude: 1.3496,
    longitude: 103.9330,
    showExactLocation: false,
    
    // Operating Hours
    operatingHours: {
      monday: { closed: true },
      tuesday: { open: "11:00", close: "21:00" },
      wednesday: { open: "11:00", close: "21:00" },
      thursday: { open: "11:00", close: "21:00" },
      friday: { open: "11:00", close: "22:00" },
      saturday: { open: "10:00", close: "22:00" },
      sunday: { open: "10:00", close: "20:00" }
    },
    holidayDates: [new Date('2025-02-12'), new Date('2025-02-13')], // CNY
    
    // Delivery Settings
    deliveryEnabled: true,
    pickupEnabled: true,
    dineInEnabled: false,
    deliveryFee: 4.50,
    minimumOrder: 35.00,
    deliveryRadius: 8,
    preparationTime: 45,
    deliveryAreas: ['Tampines', 'Pasir Ris', 'Bedok', 'Simei', 'Changi'],
    deliverySettings: {
      pricingModel: 'ZONE_BASED',
      zones: [
        { name: 'Zone 1', areas: ['Tampines'], fee: 3.00 },
        { name: 'Zone 2', areas: ['Pasir Ris', 'Simei'], fee: 4.50 },
        { name: 'Zone 3', areas: ['Bedok', 'Changi'], fee: 6.00 }
      ]
    },
    
    // Payment Settings
    paymentMethods: [PaymentMethod.PAYNOW, PaymentMethod.CASH],
    
    // Subscription (Premium Tier)
    subscriptionTier: SubscriptionTier.PREMIUM,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionExpiresAt: new Date('2025-12-31'),
    monthlyOrderLimit: 99999,
    currentMonthOrders: 287,
    
    // Status
    status: MerchantStatus.ACTIVE,
    verified: true,
    verifiedAt: new Date('2023-03-15'),
    verifiedBy: 'admin-001',
    emailVerified: true,
    phoneVerified: true,
    
    // Analytics (Established Business)
    averageRating: 4.8,
    totalReviews: 523,
    totalOrders: 3847,
    totalRevenue: 156789.50,
    responseRate: 0.98,
    averageResponseTime: 5,
    completionRate: 0.995,
    
    // Preferences
    autoAcceptOrders: true,
    autoConfirmPayment: false,
    orderNotificationEmail: 'orders@mdmwongs.com.sg',
    orderNotificationPhone: '91234568',
    language: 'en',
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: true,
    whatsappVerified: true,
    whatsappOptedInAt: new Date('2023-03-20'),
    
    // Images
    logoUrl: 'https://via.placeholder.com/200x200/8B0000/FFFFFF?text=MW',
    bannerUrl: 'https://via.placeholder.com/1200x400/8B0000/FFFFFF?text=Mdm+Wongs+Kitchen',
    
    // Metadata
    tags: ['premium', 'chinese', 'dimsum', 'established'],
    cachedStats: {
      monthlyRevenue: 12500,
      weeklyOrders: 65,
      topProducts: ['Har Gow', 'Siu Mai', 'Char Siu Bao']
    }
  })

  console.log(`✅ Merchant 1 created: ${merchant1.businessName}`)

  // Merchant 2: Malay Fusion (Growth Stage)
  const merchant2 = await createMerchantWithAuth({
    email: 'kaklong@kitchencloud.sg',
    phone: '82345678',
    businessName: "Kak Long's Fusion Kitchen",
    slug: 'kak-longs-fusion',
    
    description: 'Modern twist on traditional Malay favorites. Where sambal meets sourdough, and rendang meets risotto. Halal-certified fusion that respects tradition while embracing innovation.',
    businessType: 'Home-based Cafe',
    businessRegistrationNumber: 'T20GB0789M',
    cuisineType: ['Malay', 'Fusion', 'Modern', 'Western'],
    halal: true,
    
    // Legal & Compliance
    licenseNumber: 'SFA-HB-2024-002345',
    licenseExpiryDate: new Date('2026-01-31'),
    
    // Banking
    bankAccountName: "Nur Fatimah Binte Abdullah",
    bankAccountNumber: '456-789012-3',
    bankName: 'OCBC Bank',
    paynowNumber: '82345678',
    gstRegistered: false,
    
    // Contact & Social
    whatsappNumber: '82345678',
    instagramHandle: '@kaklongs_fusion',
    tiktokHandle: '@kaklongcooks',
    
    // Location (Jurong)
    address: 'Blk 234 Jurong East Street 21',
    postalCode: '600234',
    unitNumber: '#10-567',
    country: 'SG',
    latitude: 1.3329,
    longitude: 103.7436,
    showExactLocation: true,
    
    // Operating Hours
    operatingHours: {
      monday: { open: "12:00", close: "20:00" },
      tuesday: { open: "12:00", close: "20:00" },
      wednesday: { open: "12:00", close: "20:00" },
      thursday: { open: "12:00", close: "20:00" },
      friday: { open: "14:00", close: "22:00" }, // Friday prayers
      saturday: { open: "11:00", close: "22:00" },
      sunday: { open: "11:00", close: "21:00" }
    },
    
    // Delivery Settings
    deliveryEnabled: true,
    pickupEnabled: true,
    dineInEnabled: false,
    deliveryFee: 3.50,
    minimumOrder: 25.00,
    deliveryRadius: 6,
    preparationTime: 35,
    deliveryAreas: ['Jurong East', 'Jurong West', 'Clementi', 'Bukit Batok', 'Choa Chu Kang'],
    
    // Payment
    paymentMethods: [PaymentMethod.PAYNOW],
    
    // Subscription (Growth Tier)
    subscriptionTier: SubscriptionTier.GROWTH,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionExpiresAt: new Date('2025-09-30'),
    monthlyOrderLimit: 1000,
    currentMonthOrders: 145,
    
    // Status
    status: MerchantStatus.ACTIVE,
    verified: true,
    verifiedAt: new Date('2024-02-10'),
    emailVerified: true,
    phoneVerified: true,
    
    // Analytics (Growing Business)
    averageRating: 4.6,
    totalReviews: 98,
    totalOrders: 567,
    totalRevenue: 28450.00,
    responseRate: 0.92,
    averageResponseTime: 12,
    completionRate: 0.96,
    
    // Preferences
    autoAcceptOrders: false,
    autoConfirmPayment: false,
    orderNotificationEmail: 'orders.kaklongs@gmail.com',
    language: 'ms', // Malay
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: true,
    whatsappVerified: true,
    
    // Images
    logoUrl: 'https://via.placeholder.com/200x200/2E8B57/FFFFFF?text=KL',
    bannerUrl: 'https://via.placeholder.com/1200x400/2E8B57/FFFFFF?text=Fusion+Kitchen',
    
    tags: ['halal', 'fusion', 'innovative', 'trending']
  })

  console.log(`✅ Merchant 2 created: ${merchant2.businessName}`)

  // Merchant 3: Indian Sweets (Starter/New)
  const merchant3 = await createMerchantWithAuth({
    email: 'priya.sweets@kitchencloud.sg',
    phone: '93456789',
    businessName: "Priya's Sweet Corner",
    slug: 'priyas-sweet-corner',
    
    description: 'Authentic South Indian sweets and savories made fresh daily. From traditional mysore pak to innovative fusion mithai. Every bite is a celebration!',
    businessType: 'Home Bakery',
    businessRegistrationNumber: 'T24HB1234P',
    cuisineType: ['Indian', 'Desserts', 'Vegetarian', 'Sweets'],
    halal: false,
    
    // Legal & Compliance
    licenseNumber: 'SFA-HB-2024-008901',
    licenseExpiryDate: new Date('2026-05-31'),
    
    // Banking
    bankAccountName: "Priya Krishnan",
    paynowNumber: '93456789',
    gstRegistered: false,
    
    // Contact & Social
    whatsappNumber: '93456789',
    instagramHandle: '@priyas_sweets_sg',
    
    // Location (Little India/Serangoon)
    address: 'Blk 123 Serangoon Central',
    postalCode: '556123',
    unitNumber: '#06-789',
    buildingName: 'Serangoon Plaza',
    country: 'SG',
    latitude: 1.3508,
    longitude: 103.8723,
    showExactLocation: false,
    
    // Operating Hours (Weekends mainly)
    operatingHours: {
      monday: { closed: true },
      tuesday: { closed: true },
      wednesday: { open: "16:00", close: "20:00" },
      thursday: { open: "16:00", close: "20:00" },
      friday: { open: "15:00", close: "21:00" },
      saturday: { open: "10:00", close: "21:00" },
      sunday: { open: "10:00", close: "20:00" }
    },
    
    // Delivery Settings (Limited)
    deliveryEnabled: true,
    pickupEnabled: true,
    dineInEnabled: false,
    deliveryFee: 5.00,
    minimumOrder: 40.00,
    deliveryRadius: 5,
    preparationTime: 60, // Longer prep time for fresh sweets
    deliveryAreas: ['Serangoon', 'Little India', 'Farrer Park', 'Boon Keng'],
    
    // Payment (Cash preferred for new business)
    paymentMethods: [PaymentMethod.CASH, PaymentMethod.PAYNOW],
    
    // Subscription (Starter/Trial)
    subscriptionTier: SubscriptionTier.STARTER,
    subscriptionStatus: SubscriptionStatus.TRIAL,
    subscriptionExpiresAt: new Date('2025-02-28'),
    monthlyOrderLimit: 200,
    currentMonthOrders: 23,
    trialEndsAt: new Date('2025-01-31'),
    
    // Status (New, pending full verification)
    status: MerchantStatus.PENDING_VERIFICATION,
    verified: false,
    emailVerified: true,
    phoneVerified: false,
    
    // Analytics (New Business)
    averageRating: 4.9, // High rating but few reviews
    totalReviews: 12,
    totalOrders: 34,
    totalRevenue: 2180.00,
    responseRate: 0.88,
    averageResponseTime: 25,
    completionRate: 0.91,
    
    // Preferences
    autoAcceptOrders: false,
    autoConfirmPayment: false,
    language: 'en',
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    whatsappVerified: false,
    
    // Images
    logoUrl: 'https://via.placeholder.com/200x200/FF69B4/FFFFFF?text=PS',
    bannerUrl: 'https://via.placeholder.com/1200x400/FF69B4/FFFFFF?text=Sweet+Corner',
    
    tags: ['new', 'sweets', 'vegetarian', 'indian', 'desserts'],
    
    // Special notes
    settings: {
      requiresAdvanceOrder: true,
      specialRequests: 'All items made fresh. Minimum 1 day advance order required.',
      allergyNote: 'Contains nuts and dairy in most products'
    }
  })

  console.log(`✅ Merchant 3 created: ${merchant3.businessName}`)

  // Create merchant settings for each
  const merchantSettings = [
    {
      merchantId: merchant1.id,
      orderPrefix: 'MW',
      orderNumberFormat: 'SEQUENTIAL',
      requireOrderApproval: false, // Premium auto-accepts
      maxAdvanceOrderDays: 14,
      orderConfirmationMessage: 'Thank you for ordering from Mdm Wong\'s Kitchen! Your order has been confirmed and we\'ll start preparing it soon.',
      orderReadyMessage: 'Your delicious meal is ready! See you soon!',
      orderDeliveredMessage: 'We hope you enjoyed your meal! Please rate your experience.',
      showSoldOutItems: false,
      showPreparationTime: true,
      showCalories: false
    },
    {
      merchantId: merchant2.id,
      orderPrefix: 'KLF',
      orderNumberFormat: 'SEQUENTIAL',
      requireOrderApproval: true,
      maxAdvanceOrderDays: 7,
      orderConfirmationMessage: 'Terima kasih! Your fusion feast is confirmed. We\'ll notify you when it\'s ready.',
      orderReadyMessage: 'Your order is ready for pickup!',
      showSoldOutItems: true,
      showPreparationTime: true,
      showCalories: true
    },
    {
      merchantId: merchant3.id,
      orderPrefix: 'PSC',
      orderNumberFormat: 'RANDOM',
      requireOrderApproval: true,
      maxAdvanceOrderDays: 3,
      orderConfirmationMessage: 'Sweet! We\'ve received your order and will confirm it shortly.',
      orderReadyMessage: 'Your sweets are ready! Handle with care - they\'re fresh and delicate.',
      showSoldOutItems: true,
      showPreparationTime: true,
      showCalories: false
    }
  ]

  for (const settings of merchantSettings) {
    await prisma.merchantSettings.create({ data: settings })
  }

  console.log('✅ Merchant settings created for all merchants')

  // Output summary
  console.log('\n' + '='.repeat(60))
  console.log('🎉 3 Test merchants seeded successfully!')
  console.log('='.repeat(60))
  
  console.log('\n📋 Test Merchant Accounts:')
  console.log('------------------------')
  console.log('\n1. PREMIUM TIER - Mdm Wong\'s Kitchen (Chinese)')
  console.log('   Email: mdm.wongs@kitchencloud.sg')
  console.log('   Password: password123')
  console.log('   Status: Active, Verified, Premium Subscription')
  console.log('   Location: Tampines')
  console.log('   URL: http://localhost:3000/merchant/mdm-wongs-kitchen')
  
  console.log('\n2. GROWTH TIER - Kak Long\'s Fusion Kitchen (Malay Fusion)')
  console.log('   Email: kaklong@kitchencloud.sg')
  console.log('   Password: password123')
  console.log('   Status: Active, Verified, Growth Subscription')
  console.log('   Location: Jurong')
  console.log('   Halal: Yes')
  console.log('   URL: http://localhost:3000/merchant/kak-longs-fusion')
  
  console.log('\n3. STARTER TIER - Priya\'s Sweet Corner (Indian Sweets)')
  console.log('   Email: priya.sweets@kitchencloud.sg')
  console.log('   Password: password123')
  console.log('   Status: Pending Verification, Trial Subscription')
  console.log('   Location: Serangoon')
  console.log('   Type: Weekend Business')
  console.log('   URL: http://localhost:3000/merchant/priyas-sweet-corner')
  
  console.log('\n✨ Test Scenarios Enabled:')
  console.log('------------------------')
  console.log('- Different subscription tiers (Premium, Growth, Starter)')
  console.log('- Different verification statuses')
  console.log('- Different cuisines and dietary options (Halal/Non-Halal)')
  console.log('- Different operating hours and delivery zones')
  console.log('- Different business maturity levels (established vs new)')
  console.log('- Different payment preferences')
  console.log('- Different languages (English, Malay)')
}

main()
  .catch((e) => {
    console.error('❌ Merchant seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })