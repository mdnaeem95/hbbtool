import { db } from "./client"
import { MerchantStatus, ProductStatus, DeliveryMethod } from "@prisma/client"
import { hash } from "@node-rs/argon2"

async function seed() {
  console.log("🌱 Starting database seed...")

  // Clean existing data
  await db.notification.deleteMany()
  await db.analytics.deleteMany()
  await db.session.deleteMany()
  await db.review.deleteMany()
  await db.payment.deleteMany()
  await db.orderEvent.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.address.deleteMany()
  await db.customer.deleteMany()
  await db.merchant.deleteMany()

  console.log("✨ Creating merchants...")

  // Create test merchant
  const merchant = await db.merchant.create({
    data: {
      email: "sarah@homekitchen.sg",
      phone: "+6591234567",
      password: await hash("password123"),
      businessName: "Sarah's Home Kitchen",
      slug: "sarahs-home-kitchen",
      description: "Authentic Peranakan dishes made with love",
      businessType: "Home-based",
      cuisineType: ["Peranakan", "Local"],
      halal: true,
      address: "123 Ang Mo Kio Ave 3",
      postalCode: "560123",
      operatingHours: {
        monday: { open: "10:00", close: "20:00" },
        tuesday: { open: "10:00", close: "20:00" },
        wednesday: { open: "10:00", close: "20:00" },
        thursday: { open: "10:00", close: "20:00" },
        friday: { open: "10:00", close: "21:00" },
        saturday: { open: "09:00", close: "21:00" },
        sunday: { closed: true },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFee: 5,
      minimumOrder: 30,
      status: MerchantStatus.ACTIVE,
      verified: true,
      verifiedAt: new Date(),
    },
  })

  console.log("📁 Creating categories...")

  const categories = await Promise.all([
    db.category.create({
      data: {
        merchantId: merchant.id,
        name: "Mains",
        slug: "mains",
        sortOrder: 1,
      },
    }),
    db.category.create({
      data: {
        merchantId: merchant.id,
        name: "Desserts",
        slug: "desserts",
        sortOrder: 2,
      },
    }),
    db.category.create({
      data: {
        merchantId: merchant.id,
        name: "Beverages",
        slug: "beverages",
        sortOrder: 3,
      },
    }),
  ])

  console.log("🍜 Creating products...")

  const products = await Promise.all([
    db.product.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[0].id,
        name: "Ayam Buah Keluak",
        slug: "ayam-buah-keluak",
        description: "Traditional Peranakan chicken stew with black nuts",
        price: 28.90,
        status: ProductStatus.ACTIVE,
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
        ],
      },
    }),
    db.product.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[0].id,
        name: "Babi Pongteh",
        slug: "babi-pongteh",
        description: "Braised pork with fermented bean paste",
        price: 25.90,
        status: ProductStatus.ACTIVE,
        images: [
          "https://images.unsplash.com/photo-1606851181064-b7507b24377c",
        ],
      },
    }),
    db.product.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[1].id,
        name: "Kueh Lapis",
        slug: "kueh-lapis",
        description: "Nine-layer steamed cake",
        price: 12.90,
        status: ProductStatus.ACTIVE,
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1548848221-0c2e497ed557",
        ],
      },
    }),
  ])

  console.log("👤 Creating customers...")

  const customer = await db.customer.create({
    data: {
      email: "john@email.com",
      phone: "+6598765432",
      name: "John Tan",
      password: await hash("customer123"),
      emailVerified: true,
      phoneVerified: true,
      addresses: {
        create: {
          label: "Home",
          line1: "456 Bishan St 12",
          line2: "#10-123",
          postalCode: "570456",
          isDefault: true,
        },
      },
    },
  })

  console.log("🛍️ Creating sample order...")

  const order = await db.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}`,
      merchantId: merchant.id,
      customerId: customer.id,
      deliveryMethod: DeliveryMethod.DELIVERY,
      deliveryAddressId: (await db.address.findFirst({ where: { customerId: customer.id } }))?.id,
      deliveryFee: 5,
      subtotal: 54.80,
      total: 59.80,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            productPrice: products[0].price,
            quantity: 1,
            price: products[0].price,
            total: products[0].price,
          },
          {
            productId: products[1].id,
            productName: products[1].name,
            productPrice: products[1].price,
            quantity: 1,
            price: products[1].price,
            total: products[1].price,
          },
        ],
      },
    },
  })

  console.log("⭐ Creating sample review...")

  await db.review.create({
    data: {
      merchantId: merchant.id,
      customerId: customer.id,
      productId: products[0].id,
      orderId: order.id,
      rating: 5,
      comment: "Absolutely delicious! Tastes just like my grandma's cooking.",
      isVerified: true,
    },
  })

  console.log("✅ Seed completed successfully!")
  console.log(`
  Test Accounts:
  - Merchant: sarah@homekitchen.sg / password123
  - Customer: john@email.com / customer123
  `)
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })