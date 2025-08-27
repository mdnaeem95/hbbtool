// scripts/seed-quick.ts - Smaller dataset for quick testing
import { PrismaClient, MerchantStatus, ProductStatus, OrderStatus, PaymentStatus, PaymentMethod, DeliveryMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Create Supabase client for auth operations
const supabase = createClient(
  "https://itvvdfmgoegsfwkkstkq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dnZkZm1nb2Vnc2Z3a2tzdGtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU0NDA3NCwiZXhwIjoyMDcwMTIwMDc0fQ.uishgR7bHKyDYZDKWL7GQtNgnizLzS-pbFhVKLlNBLU", // Use service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function main() {
  console.log('🌱 Starting quick test seed...')

  // Clear existing data
  console.log('🧹 Clearing existing data...')
  await prisma.orderItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.review.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.address.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.merchantSettings.deleteMany()
  await prisma.merchant.deleteMany()

  // Create 3 test merchants
  console.log('👨‍🍳 Creating test merchants...')

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'payment-test@kitchencloud.sg',
    password: 'password123',
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      userType: 'merchant',
      businessName: 'Ah Huat Kitchen'
    }
  })

  if (authError) {
    console.error('❌ Failed to create Supabase auth user:', authError)
    throw authError
  }

  console.log('✅ Supabase auth user created:', authUser.user?.email)

  // Create comprehensive test merchant
  const merchant = await prisma.merchant.create({
    data: {
      // Required fields
      email: 'payment-test@kitchencloud.sg',
      phone: '91234567',
      businessName: 'Ah Huat Kitchen',
      slug: 'ah-huat-kitchen',
      password: await bcrypt.hash('password123', 10),
      
      // Business details
      description: 'Authentic home-cooked Singaporean favorites, made with love since 2020',
      businessType: 'Home-based Business',
      businessRegistrationNumber: 'T20GB0012K', // Sample Singapore UEN
      cuisineType: ['Singaporean', 'Chinese', 'Halal'],
      halal: true,
      
      // Legal & Compliance
      licenseNumber: 'SFA-HB-2024-001234',
      licenseExpiryDate: new Date('2025-12-31'),
      
      // Banking & Finance  
      bankAccountName: 'Ah Huat Kitchen Pte Ltd',
      paynowNumber: '91234567',
      gstRegistered: false,
      
      // Contact & Social
      whatsappNumber: '91234567',
      instagramHandle: '@ahhuat_kitchen',
      
      // Address & Location
      address: 'Blk 123 Ang Mo Kio Ave 3',
      postalCode: '560123',
      unitNumber: '#12-345',
      buildingName: 'AMK Garden Estate',
      country: 'SG',
      latitude: 1.3696,
      longitude: 103.8494,
      showExactLocation: false,
      
      // Operating Hours
      operatingHours: {
        monday: { open: "10:00", close: "20:00" },
        tuesday: { open: "10:00", close: "20:00" },
        wednesday: { open: "10:00", close: "20:00" },
        thursday: { open: "10:00", close: "20:00" },
        friday: { open: "10:00", close: "21:00" },
        saturday: { open: "09:00", close: "21:00" },
        sunday: { open: "09:00", close: "18:00" }
      },
      holidayDates: [],
      
      // Delivery Settings
      deliveryEnabled: true,
      pickupEnabled: true,
      dineInEnabled: false,
      deliveryFee: 3.00,
      minimumOrder: 20.00,
      deliveryRadius: 5,
      preparationTime: 30,
      deliveryAreas: ['Ang Mo Kio', 'Bishan', 'Serangoon', 'Hougang'],
      
      // Payment Settings
      paymentMethods: [PaymentMethod.PAYNOW, PaymentMethod.CASH],
      
      // Status & Verification
      status: MerchantStatus.ACTIVE,
      verified: true,
      verifiedAt: new Date(),
      emailVerified: true,
      phoneVerified: true,
      
      // Analytics & Performance (for established look)
      averageRating: 4.5,
      totalReviews: 127,
      totalOrders: 523,
      totalRevenue: 15678.50,
      completionRate: 0.985,
      
      // Preferences
      autoAcceptOrders: false,
      autoConfirmPayment: false,
      orderNotificationEmail: 'orders@ahhuatkitchen.sg',
      orderNotificationPhone: '91234567',
      language: 'en',
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: true,
      
      // Images
      logoUrl: 'https://via.placeholder.com/200x200/FF6B35/FFFFFF?text=AH',
      bannerUrl: 'https://via.placeholder.com/1200x400/FF6B35/FFFFFF?text=Ah+Huat+Kitchen'
    }
  })
  
  console.log('✅ Merchant created:', merchant.businessName)
  
  // Create comprehensive categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        merchantId: merchant.id,
        name: 'Signature Dishes',
        slug: 'signature',
        description: 'Our most popular home-cooked favorites',
        sortOrder: 1,
        isActive: true,
        imageUrl: 'https://via.placeholder.com/400x300/FFA500/FFFFFF?text=Signature'
      }
    }),
    prisma.category.create({
      data: {
        merchantId: merchant.id,
        name: 'Rice & Noodles',
        slug: 'rice-noodles',
        description: 'Hearty rice and noodle dishes',
        sortOrder: 2,
        isActive: true
      }
    }),
    prisma.category.create({
      data: {
        merchantId: merchant.id,
        name: 'Sides & Snacks',
        slug: 'sides',
        description: 'Perfect additions to your meal',
        sortOrder: 3,
        isActive: true
      }
    }),
    prisma.category.create({
      data: {
        merchantId: merchant.id,
        name: 'Beverages',
        slug: 'beverages',
        description: 'Refreshing drinks',
        sortOrder: 4,
        isActive: true
      }
    })
  ])
  
  console.log('✅ Categories created:', categories.length)
  
  // Create comprehensive products
  const products = [
    // Signature Dishes
    {
      categoryId: categories[0].id,
      name: 'Hainanese Chicken Rice',
      slug: 'hainanese-chicken-rice',
      description: 'Tender poached chicken with fragrant rice, served with homemade chili sauce and ginger paste',
      price: 8.80,
      compareAtPrice: 12.00,
      cost: 4.50,
      sku: 'HCR-001',
      images: [
        'https://via.placeholder.com/600x400/FFE5B4/000000?text=Chicken+Rice'
      ],
      // Food specific
      allergens: ['soy', 'garlic'],
      dietaryInfo: ['halal'],
      spiceLevel: 1,
      servingSize: 'Single portion (300g)',
      calories: 580,
      ingredients: ['Chicken', 'Rice', 'Ginger', 'Garlic', 'Soy Sauce', 'Sesame Oil'],
      // Preparation
      preparationTime: 15,
      preparationMethod: 'Freshly prepared upon order',
      shelfLife: 'Best consumed within 2 hours',
      storageInstructions: 'Keep at room temperature',
      reheatingInstructions: 'Microwave for 2 minutes if needed',
      // Inventory
      trackInventory: true,
      inventory: 50,
      lowStockThreshold: 10,
      // Availability
      maxDailyQuantity: 30,
      maxPerOrder: 5,
      requirePreorder: false,
      // Status
      status: ProductStatus.ACTIVE,
      featured: true,
      // Analytics
      viewCount: 1523,
      orderCount: 423,
      popularityScore: 95,
      tags: ['bestseller', 'signature', 'chicken', 'rice']
    },
    {
      categoryId: categories[0].id,
      name: 'Laksa Special',
      slug: 'laksa-special',
      description: 'Rich and creamy coconut curry noodle soup with prawns, fish cake, and tau pok',
      price: 10.50,
      compareAtPrice: 13.00,
      sku: 'LKS-001',
      images: [
        'https://via.placeholder.com/600x400/FF6347/FFFFFF?text=Laksa'
      ],
      allergens: ['shellfish', 'fish', 'nuts'],
      dietaryInfo: ['halal'],
      spiceLevel: 3,
      servingSize: 'Large bowl (500ml)',
      calories: 680,
      ingredients: ['Rice Noodles', 'Coconut Milk', 'Prawns', 'Fish Cake', 'Laksa Paste', 'Bean Sprouts'],
      preparationTime: 20,
      preparationMethod: 'Made to order',
      shelfLife: 'Consume immediately',
      reheatingInstructions: 'Not recommended for reheating',
      trackInventory: true,
      inventory: 30,
      lowStockThreshold: 5,
      maxDailyQuantity: 20,
      status: ProductStatus.ACTIVE,
      featured: true,
      viewCount: 892,
      orderCount: 234,
      popularityScore: 88,
      tags: ['spicy', 'soup', 'noodles', 'seafood']
    },
    // Rice & Noodles
    {
      categoryId: categories[1].id,
      name: 'Nasi Lemak with Rendang',
      slug: 'nasi-lemak-rendang',
      description: 'Fragrant coconut rice with beef rendang, ikan bilis, peanuts, egg, and sambal',
      price: 12.00,
      sku: 'NLR-001',
      images: [
        'https://via.placeholder.com/600x400/8B4513/FFFFFF?text=Nasi+Lemak'
      ],
      allergens: ['peanuts', 'egg', 'fish'],
      dietaryInfo: ['halal'],
      spiceLevel: 2,
      servingSize: 'Single set',
      calories: 750,
      preparationTime: 25,
      trackInventory: true,
      inventory: 25,
      status: ProductStatus.ACTIVE,
      tags: ['malay', 'rice', 'beef', 'traditional']
    },
    {
      categoryId: categories[1].id,
      name: 'Char Kway Teow',
      slug: 'char-kway-teow',
      description: 'Wok-fried flat rice noodles with prawns, Chinese sausage, bean sprouts, and egg',
      price: 8.00,
      sku: 'CKT-001',
      images: [
        'https://via.placeholder.com/600x400/654321/FFFFFF?text=CKT'
      ],
      allergens: ['shellfish', 'egg', 'soy'],
      dietaryInfo: ['halal'],
      spiceLevel: 1,
      servingSize: 'Single plate',
      calories: 620,
      preparationTime: 15,
      trackInventory: true,
      inventory: 40,
      status: ProductStatus.ACTIVE,
      tags: ['stirfry', 'noodles', 'hawker']
    },
    // Sides
    {
      categoryId: categories[2].id,
      name: 'Satay Skewers (6 pcs)',
      slug: 'satay-skewers',
      description: 'Grilled marinated chicken satay with peanut sauce and cucumber',
      price: 7.50,
      sku: 'SAT-001',
      images: [
        'https://via.placeholder.com/600x400/DAA520/FFFFFF?text=Satay'
      ],
      allergens: ['peanuts'],
      dietaryInfo: ['halal'],
      spiceLevel: 1,
      servingSize: '6 skewers',
      calories: 420,
      preparationTime: 15,
      trackInventory: true,
      inventory: 60,
      status: ProductStatus.ACTIVE,
      tags: ['grilled', 'skewers', 'appetizer']
    },
    // Beverages
    {
      categoryId: categories[3].id,
      name: 'Teh Tarik',
      slug: 'teh-tarik',
      description: 'Traditional pulled milk tea, frothy and sweet',
      price: 3.50,
      sku: 'TEH-001',
      images: [
        'https://via.placeholder.com/600x400/D2691E/FFFFFF?text=Teh+Tarik'
      ],
      allergens: ['dairy'],
      dietaryInfo: ['halal', 'vegetarian'],
      servingSize: 'Large cup (400ml)',
      calories: 180,
      preparationTime: 5,
      trackInventory: false,
      status: ProductStatus.ACTIVE,
      tags: ['drink', 'tea', 'traditional']
    },
    {
      categoryId: categories[3].id,
      name: 'Fresh Lime Juice',
      slug: 'lime-juice',
      description: 'Freshly squeezed lime juice with a hint of salt',
      price: 3.00,
      sku: 'LIM-001',
      images: [
        'https://via.placeholder.com/600x400/32CD32/FFFFFF?text=Lime+Juice'
      ],
      dietaryInfo: ['halal', 'vegetarian', 'vegan'],
      servingSize: 'Large glass (350ml)',
      calories: 60,
      preparationTime: 5,
      trackInventory: false,
      status: ProductStatus.ACTIVE,
      tags: ['drink', 'fresh', 'citrus']
    }
  ]
  
  const createdProducts = await Promise.all(
    products.map(p => prisma.product.create({ 
      data: {
        ...p,
        merchantId: merchant.id
      }
    }))
  )
  
  console.log('✅ Products created:', createdProducts.length)
  
  // Create test customer
  const customer = await prisma.customer.upsert({
    where: { email: 'test.customer@example.com' },
    update: {},
    create: {
      email: 'test.customer@example.com',
      phone: '98765432',
      name: 'John Tan',
      emailVerified: true,
      phoneVerified: true,
      marketingOptIn: true,
      totalOrders: 5,
      totalSpent: 156.80,
      averageOrderValue: 31.36,
      lastOrderAt: new Date(),
      addresses: {
        create: {
          label: 'Home',
          line1: 'Blk 456 Bishan Street 12',
          line2: '#08-123',
          postalCode: '570456',
          country: 'SG',
          latitude: 1.3589,
          longitude: 103.8485,
          isDefault: true,
          isValid: true,
          deliveryInstructions: 'Ring doorbell twice'
        }
      }
    }
  })
  
  console.log('✅ Customer created:', customer.name)
  
  // Create sample orders with different payment states
  const orders = [
    // Order 1: Pending payment verification
    {
      orderNumber: 'ORD-2024-001',
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      deliveryMethod: DeliveryMethod.PICKUP,
      deliveryFee: 0,
      subtotal: 19.30,
      total: 19.30,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PROCESSING,
      paymentMethod: PaymentMethod.PAYNOW,
      paymentProof: 'https://via.placeholder.com/600x800/00FF00/FFFFFF?text=Payment+Screenshot+$19.30',
      paymentReference: 'REF-' + Date.now(),
      source: 'web',
      notes: 'Customer uploaded payment proof, awaiting verification'
    },
    // Order 2: Another pending verification
    {
      orderNumber: 'ORD-2024-002',
      customerName: 'Sarah Lim',
      customerPhone: '91112222',
      customerEmail: 'sarah@example.com',
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryFee: 3.00,
      deliveryAddressId: (await prisma.address.findFirst({ where: { customerId: customer.id }}))?.id,
      subtotal: 28.50,
      total: 31.50,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PROCESSING,
      paymentMethod: PaymentMethod.PAYNOW,
      paymentProof: 'https://via.placeholder.com/600x800/0000FF/FFFFFF?text=PayNow+Proof+$31.50',
      paymentReference: 'REF-' + (Date.now() + 1),
      source: 'web',
      customerNotes: 'No chili please'
    },
    // Order 3: Completed order (for reference)
    {
      orderNumber: 'ORD-2024-003',
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deliveryMethod: DeliveryMethod.PICKUP,
      deliveryFee: 0,
      subtotal: 15.50,
      total: 15.50,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: PaymentMethod.PAYNOW,
      paymentConfirmedAt: new Date(Date.now() - 86400000), // Yesterday
      completedAt: new Date(Date.now() - 82800000),
      source: 'web'
    }
  ]
  
  for (const [index, orderData] of orders.entries()) {
    const order = await prisma.order.create({
      data: {
        ...orderData,
        merchantId: merchant.id,
        items: {
          create: [
            {
              productId: createdProducts[0]?.id!,
              productName: createdProducts[0]?.name!,
              productPrice: createdProducts[0]?.price!,
              quantity: index === 0 ? 2 : 1,
              price: createdProducts[0]?.price!,
              total: createdProducts[0]?.price.mul(index === 0 ? 2 : 1)!
            },
            ...(index === 1 ? [{
              productId: createdProducts[1]?.id!,
              productName: createdProducts[1]?.name!,
              productPrice: createdProducts[1]?.price!,
              quantity: 1,
              price: createdProducts[1]?.price!,
              total: createdProducts[1]?.price!
            }] : [])
          ]
        },
        payment: {
          create: {
            amount: orderData.total,
            currency: 'SGD',
            method: PaymentMethod.PAYNOW,
            status: orderData.paymentStatus,
            referenceNumber: orderData.paymentReference || 'PAY-' + Date.now(),
            ...(orderData.paymentStatus === PaymentStatus.COMPLETED ? {
              processedAt: orderData.paymentConfirmedAt,
              transactionId: 'TXN-' + Date.now()
            } : {})
          }
        },
        events: {
          create: [
            {
              event: 'order_created',
              data: { source: 'seed_script' },
              createdBy: 'system'
            },
            ...(orderData.paymentProof ? [{
              event: 'payment_proof_uploaded',
              data: { proofUrl: orderData.paymentProof },
              createdBy: 'customer'
            }] : [])
          ]
        }
      }
    })
    
    console.log(`✅ Order ${order.orderNumber} created - Status: ${order.status}, Payment: ${order.paymentStatus}`)
  }
  
  // Create merchant settings
  await prisma.merchantSettings.create({
    data: {
      merchantId: merchant.id,
      orderPrefix: 'ORD',
      orderNumberFormat: 'SEQUENTIAL',
      requireOrderApproval: true,
      maxAdvanceOrderDays: 7,
      orderConfirmationMessage: 'Thank you for your order! We\'ll start preparing it once payment is confirmed.',
      orderReadyMessage: 'Your order is ready for pickup!',
      showSoldOutItems: false,
      showPreparationTime: true,
      showCalories: true
    }
  })
  
  console.log('✅ Merchant settings created')
  
  // Output summary
  console.log('\n' + '='.repeat(60))
  console.log('🎉 Payment test data seeded successfully!')
  console.log('='.repeat(60))
  console.log('\n📋 Test Accounts:')
  console.log('------------------------')
  console.log('Merchant Login:')
  console.log('  Email: payment-test@kitchencloud.sg')
  console.log('  Password: password123')
  console.log('  PayNow: 91234567')
  console.log('')
  console.log('Customer Account:')
  console.log('  Email: test.customer@example.com')
  console.log('  Phone: 98765432')
  console.log('')
  console.log('🔗 URLs:')
  console.log('------------------------')
  console.log('Storefront: http://localhost:3000/merchant/ah-huat-kitchen')
  console.log('Merchant Login: http://localhost:3000/merchant/login')
  console.log('Payment Verification: http://localhost:3000/dashboard/payments')
  console.log('')
  console.log('📦 Orders Created:')
  console.log('------------------------')
  console.log('- 2 orders with pending payment verification (with proof uploaded)')
  console.log('- 1 completed order (for reference)')
  console.log('')
  console.log('✨ Next Steps:')
  console.log('------------------------')
  console.log('1. Login as merchant')
  console.log('2. Go to Dashboard > Payments')
  console.log('3. Verify the pending payments')
  console.log('4. Or test customer checkout flow at the storefront')
}

main()
  .catch((e) => {
    console.error('❌ Quick seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })