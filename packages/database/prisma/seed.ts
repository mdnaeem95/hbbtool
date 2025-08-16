// packages/database/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Initialize Supabase client for auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! // Service role key for admin operations
)

// Singapore postal codes and areas
const SINGAPORE_AREAS = [
  { area: 'Central', postalCodes: ['018956', '059100', '069533', '078881'] },
  { area: 'East', postalCodes: ['429356', '460026', '521151', '545078'] },
  { area: 'North', postalCodes: ['738099', '760171', '805469', '828761'] },
  { area: 'West', postalCodes: ['618593', '648886', '659578', '688253'] },
  { area: 'Northeast', postalCodes: ['534415', '569059', '569933', '799528'] },
]

// Sample merchant data based on Singapore home-based businesses
const MERCHANTS_DATA = [
  {
    email: 'ahmakitchen@example.com',
    phone: '91234567',
    businessName: "Ah Ma's Traditional Kitchen",
    slug: 'ah-ma-kitchen',
    description: 'Authentic Peranakan dishes made with love, just like grandma used to make',
    cuisineType: ['peranakan', 'malay', 'chinese'],
    halal: false,
    address: 'Blk 123 Tampines Street 21',
    postalCode: '521123',
    latitude: 1.3526,
    longitude: 103.9447,
    preparationTime: 45,
    minimumOrder: 30,
    deliveryFee: 5,
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    categories: ['Rice Dishes', 'Soups', 'Desserts', 'Beverages'],
    products: [
      {
        name: 'Ayam Buah Keluak',
        price: 28.80,
        description: 'Traditional Peranakan chicken stew with black nuts',
        category: 'Rice Dishes',
        spiceLevel: 2,
        preparationTime: 60,
      },
      {
        name: 'Babi Pongteh',
        price: 25.50,
        description: 'Braised pork with fermented bean paste and mushrooms',
        category: 'Rice Dishes',
        spiceLevel: 1,
      },
      {
        name: 'Itek Tim',
        price: 22.00,
        description: 'Classic duck and salted vegetable soup',
        category: 'Soups',
      },
      {
        name: 'Chendol',
        price: 4.50,
        description: 'Coconut milk dessert with green jelly and palm sugar',
        category: 'Desserts',
      },
    ],
  },
  {
    email: 'spicejourney@example.com',
    phone: '82345678',
    businessName: 'The Spice Journey',
    slug: 'spice-journey',
    description: 'North & South Indian cuisine with a modern twist',
    cuisineType: ['indian', 'vegetarian'],
    halal: true,
    address: 'Blk 456 Yishun Ring Road',
    postalCode: '760456',
    latitude: 1.4304,
    longitude: 103.8354,
    preparationTime: 30,
    minimumOrder: 25,
    deliveryFee: 4,
    logo: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    categories: ['Curries', 'Breads', 'Rice & Biryani', 'Snacks', 'Desserts'],
    products: [
      {
        name: 'Butter Chicken',
        price: 12.90,
        description: 'Creamy tomato-based curry with tender chicken',
        category: 'Curries',
        spiceLevel: 1,
        dietaryInfo: ['halal'],
      },
      {
        name: 'Palak Paneer',
        price: 10.90,
        description: 'Cottage cheese in spinach gravy',
        category: 'Curries',
        dietaryInfo: ['vegetarian', 'halal'],
      },
      {
        name: 'Hyderabadi Biryani',
        price: 14.50,
        description: 'Fragrant basmati rice with spiced meat',
        category: 'Rice & Biryani',
        spiceLevel: 3,
        dietaryInfo: ['halal'],
      },
      {
        name: 'Garlic Naan',
        price: 3.50,
        description: 'Soft flatbread with garlic and herbs',
        category: 'Breads',
        dietaryInfo: ['vegetarian', 'halal'],
      },
    ],
  },
  {
    email: 'sakurabento@example.com',
    phone: '93456789',
    businessName: 'Sakura Bento House',
    slug: 'sakura-bento',
    description: 'Authentic Japanese bento boxes and sushi platters',
    cuisineType: ['japanese', 'sushi'],
    halal: false,
    address: 'Blk 789 Jurong West Street 42',
    postalCode: '640789',
    latitude: 1.3404,
    longitude: 103.7090,
    preparationTime: 35,
    minimumOrder: 20,
    deliveryFee: 6,
    logo: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    categories: ['Bento Sets', 'Sushi', 'Ramen', 'Sides'],
    products: [
      {
        name: 'Chicken Teriyaki Bento',
        price: 12.80,
        description: 'Grilled chicken with teriyaki sauce, rice, and sides',
        category: 'Bento Sets',
      },
      {
        name: 'Salmon Sashimi Platter',
        price: 28.00,
        description: 'Fresh salmon sashimi (12 pieces)',
        category: 'Sushi',
      },
      {
        name: 'Tonkotsu Ramen',
        price: 14.50,
        description: 'Rich pork bone broth with chashu and ajitama',
        category: 'Ramen',
      },
    ],
  },
]

// Sample customer data
const CUSTOMERS_DATA = [
  {
    phone: '98765432',
    name: 'Sarah Tan',
    email: 'sarah.tan@example.com',
  },
  {
    phone: '87654321',
    name: 'Ahmad Ibrahim',
    email: 'ahmad.i@example.com',
  },
  {
    phone: '96543210',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
  },
]

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...')
  
  // Delete in correct order to respect foreign key constraints
  await prisma.orderPromotion.deleteMany()
  await prisma.promotion.deleteMany()
  await prisma.inventoryLog.deleteMany()
  await prisma.review.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.orderEvent.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.checkoutSession.deleteMany()
  await prisma.analytics.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.session.deleteMany()
  await prisma.whatsAppTemplate.deleteMany()
  await prisma.customerLoyalty.deleteMany()
  await prisma.loyaltyProgram.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.merchantSettings.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.productView.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.address.deleteMany()
  await prisma.customerNotification.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.merchant.deleteMany()
  
  console.log('✅ Database cleaned')
}

async function createMerchantInSupabase(email: string, password: string) {
  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        userType: 'merchant'
      }
    })

    if (error) {
      console.error(`Failed to create Supabase user for ${email}:`, error)
      return null
    }

    return data.user
  } catch (error) {
    console.error(`Error creating Supabase user for ${email}:`, error)
    return null
  }
}

async function seed() {
  console.log('🌱 Starting seed process...')

  try {
    await cleanDatabase()

    // Create merchants
    console.log('👨‍🍳 Creating merchants...')
    const merchants = []

    for (const merchantData of MERCHANTS_DATA) {
      // Create Supabase auth user
      const supabaseUser = await createMerchantInSupabase(
        merchantData.email,
        'Test123!' // Default password for all test merchants
      )

      if (!supabaseUser) {
        console.log(`⚠️  Skipping merchant ${merchantData.email} - Supabase user creation failed`)
        continue
      }

      // Create merchant with Supabase user ID
      const merchant = await prisma.merchant.create({
        data: {
          id: supabaseUser.id, // Use Supabase user ID
          email: merchantData.email,
          phone: merchantData.phone,
          businessName: merchantData.businessName,
          slug: merchantData.slug,
          description: merchantData.description,
          cuisineType: merchantData.cuisineType,
          halal: merchantData.halal,
          address: merchantData.address,
          postalCode: merchantData.postalCode,
          latitude: merchantData.latitude,
          longitude: merchantData.longitude,
          logoUrl: merchantData.logo,
          password: await bcrypt.hash('Test123!', 10),
          status: 'ACTIVE',
          verified: true,
          verifiedAt: new Date(),
          emailVerified: true,
          phoneVerified: true,
          preparationTime: merchantData.preparationTime,
          minimumOrder: merchantData.minimumOrder,
          deliveryFee: merchantData.deliveryFee,
          deliveryAreas: ['Singapore'],
          paymentMethods: ['PAYNOW', 'CASH'],
          deliveryEnabled: true,
          pickupEnabled: true,
          operatingHours: {
            monday: { isOpen: true, slots: [{ open: '10:00', close: '21:00' }] },
            tuesday: { isOpen: true, slots: [{ open: '10:00', close: '21:00' }] },
            wednesday: { isOpen: true, slots: [{ open: '10:00', close: '21:00' }] },
            thursday: { isOpen: true, slots: [{ open: '10:00', close: '21:00' }] },
            friday: { isOpen: true, slots: [{ open: '10:00', close: '22:00' }] },
            saturday: { isOpen: true, slots: [{ open: '09:00', close: '22:00' }] },
            sunday: { isOpen: true, slots: [{ open: '09:00', close: '21:00' }] },
          },
          subscriptionTier: 'STARTER',
          subscriptionStatus: 'ACTIVE',
        },
      })

      // Create merchant settings
      await prisma.merchantSettings.create({
        data: {
          merchantId: merchant.id,
          orderPrefix: merchantData.businessName.substring(0, 3).toUpperCase(),
          orderConfirmationMessage: `Thank you for your order! We'll start preparing it right away.`,
          orderReadyMessage: `Your order is ready for ${merchantData.businessName.includes('Delivery') ? 'delivery' : 'pickup'}!`,
        },
      })

      // Create categories for merchant
      const categoryMap: Record<string, any> = {}
      for (const categoryName of merchantData.categories) {
        const category = await prisma.category.create({
          data: {
            merchantId: merchant.id,
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            isActive: true,
          },
        })
        categoryMap[categoryName] = category
      }

      // Create products
      for (const productData of merchantData.products) {
        await prisma.product.create({
          data: {
            merchantId: merchant.id,
            categoryId: categoryMap[productData.category].id,
            name: productData.name,
            slug: productData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            description: productData.description,
            price: productData.price,
            status: 'ACTIVE',
            featured: Math.random() > 0.7,
            images: [`https://source.unsplash.com/400x300/?${encodeURIComponent(productData.name)},food`],
            spiceLevel: productData.spiceLevel,
            trackInventory: true,
            inventory: Math.floor(Math.random() * 50) + 20,
            allergens: productData.name.toLowerCase().includes('nut') ? ['nuts'] : [],
          },
        })
      }

      // Create subscription
      await prisma.subscription.create({
        data: {
          merchantId: merchant.id,
          tier: 'STARTER',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 29,
          billingCycle: 'monthly',
        },
      })

      merchants.push(merchant)
      console.log(`✅ Created merchant: ${merchant.businessName}`)
    }

    // Create customers
    console.log('👥 Creating customers...')
    const customers = []

    for (const customerData of CUSTOMERS_DATA) {
      const customer = await prisma.customer.create({
        data: {
          phone: customerData.phone,
          name: customerData.name,
          email: customerData.email,
          emailVerified: true,
          phoneVerified: true,
          addresses: {
            create: [
              {
                label: 'Home',
                line1: `Blk ${Math.floor(Math.random() * 900) + 100} Street ${Math.floor(Math.random() * 50) + 1}`,
                line2: `#${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 200) + 1}`,
                postalCode: SINGAPORE_AREAS[Math.floor(Math.random() * SINGAPORE_AREAS.length)]?.postalCodes[0]!,
                isDefault: true,
              },
            ],
          },
        },
        include: {
          addresses: true,
        },
      })
      customers.push(customer)
      console.log(`✅ Created customer: ${customer.name}`)
    }

    // Create sample orders
    console.log('📦 Creating sample orders...')
    let orderCount = 0

    for (const merchant of merchants.slice(0, 3)) {
      // Get merchant's products
      const products = await prisma.product.findMany({
        where: { merchantId: merchant.id },
        take: 5,
      })

      // Create 3-5 orders per merchant
      const numOrders = Math.floor(Math.random() * 3) + 3
      
      for (let i = 0; i < numOrders; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)]
        const address = customer?.addresses[0]
        
        // Random order items (1-3 products)
        const numItems = Math.floor(Math.random() * 3) + 1
        const selectedProducts = products
          .sort(() => Math.random() - 0.5)
          .slice(0, numItems)

        const orderItems = selectedProducts.map(product => ({
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: product.price,
          total: product.price,
        }))

        const subtotal = orderItems.reduce((sum, item) => 
          sum + (Number(item.price) * item.quantity), 0
        )
        const deliveryFee = Number(merchant.deliveryFee) || 5
        const total = subtotal + deliveryFee

        // Create order with various statuses
        const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED']
        const orderStatus = statuses[Math.floor(Math.random() * statuses.length)] as any

        const order = await prisma.order.create({
          data: {
            orderNumber: `ORD-${Date.now()}-${orderCount++}`,
            merchantId: merchant.id,
            customerId: customer?.id,
            deliveryMethod: Math.random() > 0.3 ? 'DELIVERY' : 'PICKUP',
            deliveryAddressId: address?.id,
            deliveryFee,
            customerName: customer?.name,
            customerPhone: customer?.phone,
            customerEmail: customer?.email || undefined,
            subtotal,
            total,
            status: orderStatus,
            paymentStatus: orderStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
            paymentMethod: 'PAYNOW',
            items: {
              create: orderItems.map(item => ({
                ...item,
                total: Number(item.price) * item.quantity,
              })),
            },
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
          },
        })

        // Create payment record for completed orders
        if (orderStatus === 'COMPLETED' || orderStatus === 'DELIVERED') {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              amount: total,
              method: 'PAYNOW',
              status: 'COMPLETED',
              transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              processedAt: new Date(),
            },
          })
        }

        console.log(`✅ Created order ${order.orderNumber} for ${merchant.businessName}`)
      }
    }

    // Create sample reviews
    console.log('⭐ Creating sample reviews...')
    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      include: { items: true },
    })

    for (const order of completedOrders.slice(0, 10)) {
      const rating = Math.floor(Math.random() * 2) + 4 // 4-5 stars
      
      await prisma.review.create({
        data: {
          merchantId: order.merchantId,
          customerId: order.customerId!,
          orderId: order.id,
          rating,
          comment: rating === 5 
            ? 'Excellent food and service! Will definitely order again.'
            : 'Good food, timely delivery.',
          foodQuality: rating,
          delivery: Math.floor(Math.random() * 2) + 4,
          value: Math.floor(Math.random() * 2) + 4,
          isVerified: true,
        },
      })
    }

    console.log('✅ Seed completed successfully!')
    
    // Print summary
    console.log('\n📊 Summary:')
    console.log(`- Merchants created: ${merchants.length}`)
    console.log(`- Customers created: ${customers.length}`)
    console.log(`- Orders created: ${orderCount}`)
    
    console.log('\n🔐 Test Credentials:')
    console.log('Merchant accounts (password: Test123!):')
    for (const merchant of MERCHANTS_DATA) {
      console.log(`  - ${merchant.email} (${merchant.businessName})`)
    }

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
seed()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })