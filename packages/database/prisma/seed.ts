// scripts/seed-quick.ts - Smaller dataset for quick testing
import { PrismaClient, MerchantStatus, ProductStatus, OrderStatus, PaymentStatus, PaymentMethod, DeliveryMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
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

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

const singaporePhoneNumbers = () => {
  const prefixes = ['8', '9']
  const prefix = randomChoice(prefixes)
  const number = Math.floor(Math.random() * 9000000) + 1000000
  return `+65${prefix}${number.toString().padStart(7, '0')}`
}

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
  const merchants = []

  const testMerchants = [
    {
      businessName: 'Mama Wong\'s Kitchen',
      cuisine: 'Chinese',
      email: 'mama.wong@example.com',
      slug: 'mama-wongs-kitchen'
    },
    {
      businessName: 'Satay King',
      cuisine: 'Malay', 
      email: 'satay.king@example.com',
      slug: 'satay-king'
    },
    {
      businessName: 'Pizza Corner',
      cuisine: 'Western',
      email: 'pizza.corner@example.com', 
      slug: 'pizza-corner'
    }
  ]

  for (let i = 0; i < testMerchants.length; i++) {
    const merchantData = testMerchants[i]
    
    console.log(`👨‍🍳 Creating merchant ${i + 1}: ${merchantData.businessName}`)
    
    // First, create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: merchantData.email,
      password: 'password123',
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        userType: 'merchant',
        businessName: merchantData.businessName
      }
    })

    if (authError) {
      console.error(`❌ Failed to create auth user for ${merchantData.email}:`, authError)
      continue
    }

    if (!authData.user) {
      console.error(`❌ No user returned for ${merchantData.email}`)
      continue
    }

    console.log(`✅ Created Supabase auth user: ${authData.user.id}`)

    // Now create the merchant record with the auth user ID
    const merchant = await prisma.merchant.create({
      data: {
        id: authData.user.id, // Use Supabase user ID
        email: merchantData.email,
        phone: singaporePhoneNumbers(),
        businessName: merchantData.businessName,
        slug: merchantData.slug,
        description: `Delicious ${merchantData.cuisine} cuisine made with love and care.`,
        logoUrl: `https://picsum.photos/seed/merchant${i}/300/300`,
        
        businessType: 'Home-based',
        cuisineType: [merchantData.cuisine],
        halal: merchantData.cuisine === 'Malay',
        
        address: `Blk ${randomBetween(100, 999)} Test Street ${randomBetween(1, 50)}`,
        postalCode: '123456',
        latitude: 1.3521 + (i * 0.01),
        longitude: 103.8198 + (i * 0.01),
        
        operatingHours: {
          monday: { open: "09:00", close: "21:00", isOpen: true },
          tuesday: { open: "09:00", close: "21:00", isOpen: true },
          wednesday: { open: "09:00", close: "21:00", isOpen: true },
          thursday: { open: "09:00", close: "21:00", isOpen: true },
          friday: { open: "09:00", close: "22:00", isOpen: true },
          saturday: { open: "10:00", close: "22:00", isOpen: true },
          sunday: { open: "10:00", close: "20:00", isOpen: true }
        },
        
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: randomDecimal(3, 6),
        minimumOrder: randomDecimal(20, 30),
        preparationTime: 30,
        
        paymentMethods: [PaymentMethod.PAYNOW, PaymentMethod.CASH],
        paynowNumber: singaporePhoneNumbers().replace('+65', ''),
        
        averageRating: randomDecimal(4.0, 5.0, 1),
        totalReviews: randomBetween(20, 50),
        totalOrders: randomBetween(100, 300),
        totalRevenue: randomDecimal(5000, 15000),
        
        password: await bcrypt.hash('password123', 10), // Still store hashed password for compatibility
        emailVerified: true,
        phoneVerified: true,
        status: MerchantStatus.ACTIVE,
        verified: true,
        verifiedAt: new Date(),
      }
    })
    merchants.push(merchant)

    console.log(`✅ Created merchant record: ${merchant.businessName}`)

    // Create merchant settings
    await prisma.merchantSettings.create({
      data: {
        merchantId: merchant.id,
        orderPrefix: 'ORD',
        requireOrderApproval: true,
        showSoldOutItems: true,
        showPreparationTime: true,
      }
    })
  }

  // Create categories and products
  console.log('🏷️ Creating categories and products...')
  const categoryProducts = {
    'Chinese': {
      'Main Dishes': ['Sweet & Sour Pork', 'Kung Pao Chicken', 'Mapo Tofu'],
      'Rice & Noodles': ['Yang Chow Fried Rice', 'Beef Noodles', 'Wonton Noodles'],
      'Dim Sum': ['Har Gow', 'Siu Mai', 'Char Siu Bao']
    },
    'Malay': {
      'Rice Dishes': ['Nasi Lemak', 'Nasi Briyani', 'Nasi Goreng'],
      'Grilled Items': ['Satay Chicken', 'Satay Beef', 'Grilled Fish'],
      'Curry': ['Rendang', 'Curry Chicken', 'Fish Curry']
    },
    'Western': {
      'Pizza': ['Margherita Pizza', 'Pepperoni Pizza', 'Hawaiian Pizza'],
      'Burgers': ['Classic Beef Burger', 'Chicken Burger', 'Veggie Burger'],
      'Pasta': ['Carbonara', 'Bolognese', 'Aglio Olio']
    }
  }

  const allProducts = []
  for (const merchant of merchants) {
    const cuisine = merchant.cuisineType[0] as keyof typeof categoryProducts
    const categories = categoryProducts[cuisine]
    
    let productCounter = 1 // Global counter per merchant

    for (const [categoryName, products] of Object.entries(categories)) {
      // Create category
      const category = await prisma.category.create({
        data: {
          merchantId: merchant.id,
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description: `${categoryName} from ${merchant.businessName}`,
          isActive: true,
        }
      })

      // Create products
      for (let i = 0; i < products.length; i++) {
        const productName = products[i]
        const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        
        const product = await prisma.product.create({
          data: {
            merchantId: merchant.id,
            categoryId: category.id,
            sku: `${merchant.slug.toUpperCase()}-${categorySlug.toUpperCase()}-${productCounter}`,
            name: productName,
            slug: `${productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${productCounter}`,
            description: `Delicious ${productName} made with authentic ingredients.`,
            images: [`https://picsum.photos/seed/${productName.replace(/\s/g, '')}${productCounter}/600/400`],
            
            price: randomDecimal(12, 28),
            cost: randomDecimal(5, 12),
            
            trackInventory: true,
            inventory: randomBetween(20, 50),
            
            status: ProductStatus.ACTIVE,
            featured: productCounter === 1, // First product overall is featured
            
            allergens: [],
            dietaryInfo: productName.includes('Tofu') || productName.includes('Veggie') ? ['vegetarian'] : [],
            spiceLevel: cuisine === 'Malay' ? randomBetween(1, 4) : null,
            servingSize: 'Serves 1',
            calories: randomBetween(300, 600),
            
            preparationTime: randomBetween(15, 30),
            
            viewCount: randomBetween(20, 100),
            orderCount: randomBetween(5, 30),
            popularityScore: randomBetween(30, 90),
            
            publishedAt: new Date(),
          }
        })
        allProducts.push({ ...product, merchantId: merchant.id })
        productCounter++ // Increment global counter
      }
    }
  }

  // Create 10 test customers
  console.log('👥 Creating test customers...')
  const customers = []
  const testCustomers = [
    { firstName: 'John', lastName: 'Tan' },
    { firstName: 'Mary', lastName: 'Lim' },
    { firstName: 'David', lastName: 'Wong' },
    { firstName: 'Sarah', lastName: 'Lee' },
    { firstName: 'Michael', lastName: 'Ng' },
    { firstName: 'Lisa', lastName: 'Ong' },
    { firstName: 'James', lastName: 'Teo' },
    { firstName: 'Anna', lastName: 'Chua' },
    { firstName: 'Robert', lastName: 'Goh' },
    { firstName: 'Emily', lastName: 'Low' }
  ]

  for (let i = 0; i < testCustomers.length; i++) {
    const { firstName, lastName } = testCustomers[i]
    const customer = await prisma.customer.create({
      data: {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: singaporePhoneNumbers(),
        name: `${firstName} ${lastName}`,
        
        emailVerified: true,
        phoneVerified: true,
        marketingOptIn: Math.random() > 0.5,
        
        referralCode: `REF${nanoid(6).toUpperCase()}`,
        totalOrders: randomBetween(3, 15),
        totalSpent: randomDecimal(100, 500),
        averageOrderValue: randomDecimal(25, 45),
      }
    })
    customers.push(customer)

    // Create address
    await prisma.address.create({
      data: {
        customerId: customer.id,
        label: 'Home',
        line1: `Blk ${randomBetween(100, 999)} Test Avenue ${randomBetween(1, 20)}`,
        line2: `#${randomBetween(10, 20)}-${randomBetween(100, 150)}`,
        postalCode: `${randomBetween(100000, 999999)}`,
        latitude: 1.3521 + randomDecimal(-0.05, 0.05, 4),
        longitude: 103.8198 + randomDecimal(-0.05, 0.05, 4),
        isDefault: true,
      }
    })
  }

  // Create 50 test orders
  console.log('🛒 Creating test orders...')
  for (let i = 0; i < 50; i++) {
    const merchant = randomChoice(merchants)
    const customer = randomChoice(customers)
    const merchantProducts = allProducts.filter(p => p.merchantId === merchant.id)
    
    const deliveryMethod = randomChoice([DeliveryMethod.PICKUP, DeliveryMethod.DELIVERY])
    const orderDate = new Date(Date.now() - randomBetween(1, 30) * 24 * 60 * 60 * 1000)
    
    // Get customer address for delivery
    let deliveryAddress = null
    if (deliveryMethod === DeliveryMethod.DELIVERY) {
      deliveryAddress = await prisma.address.findFirst({
        where: { customerId: customer.id }
      })
    }
    
    // Create order items
    const itemCount = randomBetween(1, 3)
    const orderItems = []
    let subtotal = 0
    
    for (let j = 0; j < itemCount; j++) {
      const product = randomChoice(merchantProducts)
      const quantity = randomBetween(1, 2)
      const price = parseFloat(product.price.toString())
      const itemTotal = price * quantity
      subtotal += itemTotal
      
      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productPrice: price,
        quantity,
        price,
        total: itemTotal,
      })
    }
    
    const deliveryFee = deliveryMethod === DeliveryMethod.DELIVERY ? parseFloat(merchant.deliveryFee.toString()) : 0
    const gstAmount = (subtotal + deliveryFee) * 0.07
    const total = subtotal + deliveryFee + gstAmount
    
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD${String(Date.now()).slice(-8)}${String(i).padStart(2, '0')}`,
        merchantId: merchant.id,
        customerId: customer.id,
        
        deliveryMethod,
        deliveryAddressId: deliveryAddress?.id,
        deliveryFee,
        
        orderType: 'immediate',
        estimatedReady: new Date(orderDate.getTime() + 30 * 60 * 1000),
        
        subtotal,
        gstAmount,
        total,
        
        status: randomChoice([
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.COMPLETED,
          OrderStatus.COMPLETED, // More completed orders
          OrderStatus.COMPLETED,
        ]),
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYNOW,
        
        paymentReference: `PAY${nanoid(8).toUpperCase()}`,
        paymentConfirmedAt: new Date(orderDate.getTime() + 5 * 60 * 1000),
        
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        
        source: 'web',
        
        createdAt: orderDate,
        updatedAt: orderDate,
        confirmedAt: new Date(orderDate.getTime() + 5 * 60 * 1000),
      }
    })

    // Create order items
    for (const item of orderItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          ...item,
          createdAt: orderDate,
        }
      })
    }

    // Create payment
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: 'SGD',
        method: PaymentMethod.PAYNOW,
        status: PaymentStatus.COMPLETED,
        gatewayProvider: 'paynow',
        transactionId: `TXN${nanoid(12).toUpperCase()}`,
        referenceNumber: order.paymentReference,
        gatewayFee: total * 0.025,
        netAmount: total * 0.975,
        createdAt: orderDate,
        processedAt: new Date(orderDate.getTime() + 2 * 60 * 1000),
      }
    })
  }

  // Create some reviews
  console.log('⭐ Creating reviews...')
  const completedOrders = await prisma.order.findMany({
    where: { status: OrderStatus.COMPLETED },
    include: { 
      customer: { select: { id: true, name: true } },
      merchant: { select: { id: true } }
    },
    take: 15
  })
  
  for (const order of completedOrders) {
    if (Math.random() > 0.4 && order.customer && order.customerId) { // 60% chance of review
      try {
        await prisma.review.create({
          data: {
            merchantId: order.merchantId,
            customerId: order.customerId,
            orderId: order.id,
            
            rating: randomBetween(4, 5), // Mostly positive
            title: randomChoice(['Great food!', 'Loved it', 'Excellent service', 'Delicious!']),
            comment: randomChoice([
              'Food was delicious and delivered on time!',
              'Great authentic flavors, will order again.',
              'Excellent quality and generous portions.',
              'Fast delivery and still hot when arrived.',
              'Highly recommend this place!'
            ]),
            
            foodQuality: randomBetween(4, 5),
            delivery: randomBetween(4, 5),
            value: randomBetween(4, 5),
            
            isVerified: true,
            isVisible: true,
            
            createdAt: new Date(order.createdAt.getTime() + randomBetween(1, 5) * 24 * 60 * 60 * 1000),
          }
        })
      } catch (error) {
        console.warn(`⚠️ Failed to create review for order ${order.orderNumber}: ${error}`)
        continue
      }
    }
  }

  console.log('✅ Quick test seed completed!')
  console.log(`
📊 QUICK TEST SEED SUMMARY:
• 3 Test Merchants (Chinese, Malay, Western)
• ~27 Products (9 per merchant)
• 10 Test Customers  
• 50 Test Orders
• ~15 Reviews

🔑 TEST LOGIN CREDENTIALS:
• mama.wong@example.com / password123
• satay.king@example.com / password123  
• pizza.corner@example.com / password123

🎯 Perfect for testing notifications and basic functionality!
  `)
}

main()
  .catch((e) => {
    console.error('❌ Quick seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })